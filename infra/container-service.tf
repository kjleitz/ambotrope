# ──────────────────────────────────────────────
# Lightsail Certificate (for custom domain HTTPS)
# ──────────────────────────────────────────────

resource "aws_lightsail_certificate" "api" {
  name        = "${var.project_name}-api"
  domain_name = "api.${var.domain_name}"

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# ──────────────────────────────────────────────
# Lightsail Container Service
# ──────────────────────────────────────────────

resource "aws_lightsail_container_service" "server" {
  name  = "${var.project_name}-server"
  power = "nano"
  scale = 1

  public_domain_names {
    certificate {
      certificate_name = aws_lightsail_certificate.api.name
      domain_names     = ["api.${var.domain_name}"]
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

# Deployments are managed by scripts/deploy-server.sh, not Terraform.
# The aws_lightsail_container_service_deployment_version resource can't be
# destroyed, so managing it in Terraform creates state drift. The deploy
# script handles pushing images and creating deployments via the AWS CLI.
