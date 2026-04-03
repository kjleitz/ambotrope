resource "time_rotating" "ssm_activation_expiry" {
  rotation_days = 29
}

resource "aws_iam_role" "ssm_managed_node" {
  name = "${var.project_name}-${var.environment}-ssm-managed-node"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ssm.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_managed_node_core" {
  role       = aws_iam_role.ssm_managed_node.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_ssm_activation" "server" {
  name                  = "${var.project_name}-${var.environment}-server"
  description           = "Hybrid activation for the ${var.project_name} Lightsail server"
  iam_role              = aws_iam_role.ssm_managed_node.name
  registration_limit    = 1
  expiration_date       = time_rotating.ssm_activation_expiry.rotation_rfc3339

  depends_on = [aws_iam_role_policy_attachment.ssm_managed_node_core]
}

resource "aws_lightsail_instance" "server" {
  name              = "${var.project_name}-server"
  availability_zone = var.availability_zone
  blueprint_id      = var.instance_blueprint_id
  bundle_id         = var.instance_bundle_id

  user_data = templatefile("${path.module}/templates/cloud-init.yaml", {
    api_domain          = "api.${var.domain_name}"
    aws_region          = var.aws_region
    cors_origin         = var.cors_origin
    domain_enabled      = var.domain_enabled
    project_name        = var.project_name
    server_image        = var.server_image
    server_port         = var.server_port
    ssm_activation_code = aws_ssm_activation.server.activation_code
    ssm_activation_id   = aws_ssm_activation.server.id
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
