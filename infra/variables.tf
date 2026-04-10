variable "aws_region" {
  description = "AWS region for infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "ambotrope"
}

variable "environment" {
  description = "Deployment environment tag"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Root domain name"
  type        = string
  default     = "ambotrope.com"
}

variable "server_port" {
  description = "Internal application port exposed by the container"
  type        = number
  default     = 3000
}

variable "cors_origin" {
  description = "Comma-separated CORS origins allowed by the game server"
  type        = string
  default     = "https://www.ambotrope.com,https://ambotrope.com"
}
