variable "location" {
  type    = string
  default = "eastus"
}

variable "project_name" {
  type    = string
  default = "jays-surf-shop"
}

variable "environment" {
  type    = string
  default = "demo"
}

variable "owner" {
  type    = string
  default = "workshop-team"
}

variable "cost_center" {
  type    = string
  default = "security-demo"
}

variable "github_deploy_repo" {
  type    = string
  default = "AstralJays/JaysSurfShop-Azure"
}

variable "github_scan_repo" {
  type    = string
  default = "JustinDPerkins/shiftleft-automated"
}

variable "openai_api_key" {
  type      = string
  sensitive = true
}

variable "allowed_cidr_blocks" {
  type    = list(string)
  default = ["0.0.0.0/0"]
}

variable "image_tag" {
  type    = string
  default = "latest"
}

variable "min_replicas" {
  type    = number
  default = 1
}

variable "max_replicas" {
  type    = number
  default = 2
}

variable "upwind_client_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "upwind_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "upwind_tracer_image" {
  type    = string
  default = "public.ecr.aws/upwindsecurity/images/tracer:0.7.17"
}

variable "upwind_region" {
  type    = string
  default = "us"
}

variable "upwind_function_client_id" {
  type      = string
  sensitive = true
  default   = ""
}

variable "upwind_function_client_secret" {
  type      = string
  sensitive = true
  default   = ""
}

variable "upwind_function_region" {
  type    = string
  default = "us"
}
