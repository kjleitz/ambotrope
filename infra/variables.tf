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

variable "domain_enabled" {
  description = "Enable Route 53 and ACM resources after the domain is registered and delegated"
  type        = bool
  default     = false
}

variable "instance_bundle_id" {
  description = "Lightsail bundle ID"
  type        = string
  default     = "nano_3_0"
}

variable "instance_blueprint_id" {
  description = "Lightsail blueprint image"
  type        = string
  default     = "ubuntu_24_04"
}

variable "availability_zone" {
  description = "Lightsail availability zone"
  type        = string
  default     = "us-east-1a"
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key to import into Lightsail"
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

variable "ssh_allowed_cidrs" {
  description = "CIDR blocks allowed to SSH to the instance"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "server_image" {
  description = "Container image that the instance should run"
  type        = string
}

variable "server_port" {
  description = "Internal application port exposed by the container"
  type        = number
  default     = 3000
}

variable "cors_origin" {
  description = "CORS origin allowed by the game server"
  type        = string
  default     = "https://www.ambotrope.com"
}
