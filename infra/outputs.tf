output "web_url" {
  description = "Frontend URL"
  value       = "https://www.${var.domain_name}"
}

output "api_url" {
  description = "API URL"
  value       = "https://api.${var.domain_name}"
}

output "web_bucket_name" {
  description = "S3 bucket name for frontend deployments"
  value       = aws_s3_bucket.web.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for frontend cache invalidation"
  value       = aws_cloudfront_distribution.web.id
}

output "container_service_url" {
  description = "Lightsail container service default URL"
  value       = replace(replace(aws_lightsail_container_service.server.url, "https://", ""), "/", "")
}

output "container_service_name" {
  description = "Lightsail container service name (for deploy script)"
  value       = aws_lightsail_container_service.server.name
}

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "lightsail_cert_validation_records" {
  description = "DNS validation records for the Lightsail certificate (one-time)"
  value       = aws_lightsail_certificate.api.domain_validation_options
}

output "nameservers" {
  description = "Route 53 nameservers to set at the registrar"
  value       = aws_route53_zone.main.name_servers
}
