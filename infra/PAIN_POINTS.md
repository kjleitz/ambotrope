# Infrastructure Pain Points

Issues encountered during provisioning and deployment (2026-04-03/04).

## 1. `domain_enabled` toggle destroyed production DNS

Setting `domain_enabled = false` (accidentally or as default) caused `terraform apply` to destroy the Route 53 hosted zone, all DNS records, the ACM certificate, and CloudFront aliases. The site went completely offline. Recreating the zone assigned new nameservers, requiring a manual update at the domain registrar and a DNS propagation wait.

**Why:** Every DNS/ACM resource used `count = var.domain_enabled ? 1 : 0`. Terraform treats a count change from 1 to 0 as "destroy this resource." There was no lifecycle protection on the hosted zone.

**Status:** Fixed. Removed the `domain_enabled` variable entirely; all DNS resources are now unconditional.

## 2. Static IP detaches on instance replacement

Every time the Lightsail instance was destroyed and recreated (bundle size change, user_data change, taint), the static IP ended up detached. Terraform state showed it as attached, but the Lightsail console showed a different IP on the instance. Required `terraform apply` again (sometimes with `-refresh-only` first) to reattach.

**Why:** Lightsail's API appears to report the static IP attachment as successful during the destroy/create cycle, but the attachment is actually lost. Terraform records success in state before the API has fully reconciled. The provider doesn't detect the drift until an explicit refresh.

**Status:** Partially mitigated. Added `create_before_destroy` on the attachment resource. The real fix is to stop recreating the instance unnecessarily (see below).

## 3. Instance recreated on every user_data change

Lightsail's `user_data` is a ForceNew attribute. Any change to the bootstrap script template or its input variables (adding a variable, changing a default, reformatting whitespace) triggered a full instance destroy/recreate. This compounded with the static IP detachment issue above.

**Why:** Lightsail instances don't support in-place user_data updates. The only way to change it is to replace the instance. Terraform has no way to distinguish "bootstrap script changed but the instance is already running fine" from "the instance needs reprovisioning."

**Status:** Fixed. Added `lifecycle { ignore_changes = [user_data] }`. Bootstrap changes now require either an explicit `terraform taint` or SSHing in to update config manually.

## 4. Caddyfile templated with wrong config at boot

The bootstrap script conditionally wrote the Caddyfile based on `domain_enabled`. When the instance was first created with `domain_enabled = false`, Caddy got a `:80` config instead of `api.ambotrope.com`. After flipping `domain_enabled = true`, the instance wasn't recreated (due to `ignore_changes`), so Caddy kept the stale `:80` config. Had to SSH in to manually update the Caddyfile.

**Why:** user_data runs once at instance creation. There's no mechanism to push config updates to a running instance through Terraform. The `domain_enabled` conditional in the Caddyfile template meant the baked-in config depended on the value at creation time, not the current value.

**Status:** Fixed. Removed the conditional from the Caddyfile template; it always uses `api.ambotrope.com` now.

## 5. Caddy doesn't enable HTTPS on first boot

Even with the correct Caddyfile (`api.ambotrope.com { ... }`), Caddy started in HTTP-only mode after a fresh instance boot. Logs showed "server is listening only on the HTTP port, so no automatic HTTPS will be applied." Required an explicit `caddy reload --config /etc/caddy/Caddyfile` to kick it into HTTPS mode.

**Why:** Unknown root cause. Possibly a race condition in the Ubuntu-packaged Caddy 2.6.2 where `systemctl enable --now caddy` starts the process before the Caddyfile is fully written/flushed, or before DNS has propagated to the point where Caddy can resolve its own domain for the ACME challenge. The `caddy reload` CLI command re-parses the config and triggers TLS provisioning.

**Status:** Mitigated. Added `caddy reload` to the bootstrap script after the initial `systemctl enable --now caddy`. Not 100% confident this is a reliable fix since the underlying cause isn't fully understood.

## 6. CloudFront function can't be deleted while in use

`terraform apply` failed with "Cannot delete function, it is in use by 1 distributions" when trying to remove the CloudFront apex-to-www redirect function. The error cascaded — Terraform aborted the apply, leaving the state partially applied (some resources destroyed, others not).

**Why:** Terraform planned to delete the CloudFront function and update the distribution in parallel (or in the wrong order). The CloudFront API requires the function to be disassociated from all distributions before deletion. Terraform's dependency graph didn't capture this implicit ordering.

**Status:** Fixed. Added `lifecycle { create_before_destroy = true }` to the CloudFront function, and removed the `domain_enabled` conditional so the function is never conditionally destroyed.

## 7. SSH blocked over IPv6

`ssh` and all deploy scripts hung with "Operation timed out." The Lightsail firewall only had IPv4 CIDRs (`0.0.0.0/0`), but the local machine was connecting over IPv6 (confirmed via `curl ifconfig.me` returning a `2600:...` address). IPv6 traffic was silently dropped by the firewall.

**Why:** The firewall `port_info` blocks only specified `cidrs` (IPv4), not `ipv6_cidrs`. Lightsail's firewall treats IPv4 and IPv6 as separate rule sets. No IPv6 rule = all IPv6 traffic dropped.

**Status:** Fixed. Added `ipv6_cidrs = ["::/0"]` (and a corresponding variable for SSH) to all firewall port_info blocks.

## 8. Docker image architecture mismatch

`docker pull` on the Lightsail instance (x86_64) failed with "no matching manifest for linux/amd64" because the image was built on an Apple Silicon Mac (ARM64) without specifying the target platform.

**Why:** Docker defaults to the host architecture when building. Mac M-series chips are ARM64, Lightsail instances are x86_64. Without `--platform linux/amd64`, the pushed image only has an ARM64 manifest.

**Status:** Fixed. Added `--platform linux/amd64` to the `docker build` command in `deploy-server.sh`.

## 9. `ssh.sh` stderr redirect broke interactive SSH

The SSH wrapper script redirected stderr to a temp file (`2>"${TMP_STDERR}"`) to detect host key changes. This captured all interactive prompts (host key verification, password prompts, connection warnings) to the file, making them invisible. SSH appeared to hang because the user couldn't see or respond to prompts.

**Why:** The script was designed to detect and surface "REMOTE HOST IDENTIFICATION HAS CHANGED" errors with a helpful recovery message, but the implementation swallowed all stderr during the session instead of just inspecting it after failure.

**Status:** Fixed. Changed to `2> >(tee "${TMP_STDERR}" >&2)` which duplicates stderr to both the terminal and the temp file.

## 10. 512MB instance OOM under full stack

The nano Lightsail instance (512MB RAM) became unresponsive when running Docker + game server container + Caddy simultaneously. SSH sessions hung, commands timed out, Caddy couldn't provision TLS certificates.

**Why:** Docker daemon + a Node.js container + Caddy (with TLS provisioning doing crypto operations) exceeded 512MB. No swap was configured. The OOM killer likely started killing processes or the kernel started thrashing.

**Status:** Fixed. Upgraded to `micro_3_0` (1GB RAM, $10/mo).

## 11. Deploy script doesn't detect host key changes

`deploy-server.sh` used raw `ssh` instead of the `ssh.sh` wrapper, so when the instance was recreated (new host keys), the deploy failed with a host key mismatch error and no helpful guidance.

**Why:** The deploy script was written before the `ssh.sh` wrapper existed, and wasn't updated to use it.

**Status:** Fixed. `deploy-server.sh` now calls `ssh.sh` for remote commands.

## 12. DNS propagation delays after zone recreation

After the Route 53 hosted zone was destroyed and recreated, the new zone got different nameservers. The old nameservers at the registrar pointed to nothing. Even after updating the registrar, DNS propagation took 15+ minutes before the domain resolved again.

**Why:** This is inherent to how DNS works. Recreating a hosted zone assigns new NS records. Until the registrar pushes the updated nameservers and caches expire, the domain is unreachable. There's no way to speed this up.

**Status:** Mitigated by never destroying the hosted zone (removed `domain_enabled` toggle, added `lifecycle { prevent_destroy = true }` to the zone resource). If the zone is ever recreated again, the nameserver update and propagation wait are unavoidable.

## 13. SSH open to the internet

The Lightsail firewall allows SSH from all IPv4 (`0.0.0.0/0`) and IPv6 (`::/0`) addresses. This is a standing security risk — the instance is exposed to brute-force attacks and credential stuffing from the entire internet. The SSH key requirement helps, but an open port 22 is still unnecessary attack surface.

**Why:** SSH was the fastest path to "get something deployed." There was no alternative access mechanism in place (no SSM, no bastion, no VPN), so the port had to be open for both interactive debugging and the deploy script.

**Status:** Open. Should be closed once an alternative deployment mechanism is in place (see #14).

## 14. Deployment requires SSH

The entire deploy pipeline (`deploy-server.sh`) depends on SSHing into the instance to pull the Docker image and restart the systemd service. This means port 22 must remain open, the deployer's IP must be allowed through the firewall, and host key changes after instance recreation require manual `ssh-keygen -R` cleanup.

**Why:** SSH was the simplest deployment mechanism for a single instance. No CI/CD pipeline, no SSM, no pull-based deployment (e.g. the instance polling for new images).

**Status:** Open. Candidates for replacing SSH-based deployment:
- **AWS SSM (Systems Manager):** Run commands on the instance without opening port 22. Requires an IAM role on the instance, which Lightsail doesn't natively support (would need an EC2 instance or a workaround with IAM user credentials).
- **Pull-based deployment:** The instance polls a registry or S3 on a timer (or via webhook) and pulls new images itself. No inbound access needed. Simplest option for a single instance.
- **CI/CD (GitHub Actions):** Build, push, and trigger a deploy from CI. Still needs a way to reach the instance (SSM, webhook, or similar).

## 15. No zero-to-production provisioning path

There is no way to `terraform apply` from a blank slate and end up with a fully working production environment without manual steps. Known manual steps after a fresh provision:

1. Update nameservers at the domain registrar (unavoidable).
2. Wait for DNS propagation (unavoidable).
3. Clear stale SSH host keys locally (`ssh-keygen -R`).
4. Run `caddy reload` on the instance because Caddy doesn't pick up the HTTPS config on first boot (see #5).
5. Run `pnpm deploy:server` to push the game server image (bootstrap pulls the image, but if it's not yet pushed to GHCR, the systemd service fails on first boot).
6. Potentially run `terraform apply` a second time to reattach the static IP if it detached during instance creation (see #2).

**Why:** The infrastructure was built incrementally, with manual fixes applied along the way that were never folded back into the automated provisioning. The bootstrap script assumes things that aren't guaranteed on a fresh provision (GHCR image exists, Caddy will auto-configure HTTPS, static IP will attach on first try).

**Status:** Open. Goal: `terraform apply` + one deploy command should produce a fully working environment. The only acceptable manual steps should be one-time registrar setup (nameservers) and DNS propagation wait.
