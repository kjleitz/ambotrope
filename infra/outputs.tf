output "web_url" {
  description = "Frontend URL"
  value       = var.domain_enabled ? "https://www.${var.domain_name}" : "https://${aws_cloudfront_distribution.web.domain_name}"
}

output "api_url" {
  description = "API URL"
  value       = var.domain_enabled ? "https://api.${var.domain_name}" : "http://${aws_lightsail_static_ip.server.ip_address}"
}

output "web_bucket_name" {
  description = "S3 bucket name for frontend deployments"
  value       = aws_s3_bucket.web.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for frontend cache invalidation"
  value       = aws_cloudfront_distribution.web.id
}

output "lightsail_instance_name" {
  description = "Lightsail instance name"
  value       = aws_lightsail_instance.server.name
}

output "lightsail_static_ip" {
  description = "Public static IPv4 address for the server"
  value       = aws_lightsail_static_ip.server.ip_address
}

output "server_image" {
  description = "Container image URI configured for the server"
  value       = var.server_image
}

output "ssm_activation_id" {
  description = "SSM hybrid activation ID used to register the Lightsail host"
  value       = aws_ssm_activation.server.id
}

output "nameservers" {
  description = "Route 53 nameservers to set at the registrar"
  value       = var.domain_enabled ? aws_route53_zone.main[0].name_servers : []
}
