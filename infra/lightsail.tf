resource "aws_lightsail_instance" "server" {
  name              = "${var.project_name}-server"
  availability_zone = var.availability_zone
  blueprint_id      = var.instance_blueprint_id
  bundle_id         = var.instance_bundle_id
  key_pair_name     = var.ssh_key_pair_name

  user_data = templatefile("${path.module}/templates/cloud-init.yaml", {
    api_domain     = "api.${var.domain_name}"
    cors_origin    = var.cors_origin
    domain_enabled = var.domain_enabled
    project_name   = var.project_name
    server_image   = var.server_image
    server_port    = var.server_port
  })

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_lightsail_static_ip" "server" {
  name = "${var.project_name}-server-ip"
}

resource "aws_lightsail_static_ip_attachment" "server" {
  static_ip_name = aws_lightsail_static_ip.server.name
  instance_name  = aws_lightsail_instance.server.name
}

resource "aws_lightsail_instance_public_ports" "server" {
  instance_name = aws_lightsail_instance.server.name

  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
    cidrs     = var.ssh_allowed_cidrs
  }

  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
    cidrs     = ["0.0.0.0/0"]
  }

  port_info {
    protocol  = "tcp"
    from_port = 443
    to_port   = 443
    cidrs     = ["0.0.0.0/0"]
  }
}
