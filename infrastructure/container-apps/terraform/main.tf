terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

module "workshop" {
  source = "../../modules/workshop"

  location            = var.location
  project_name        = var.project_name
  environment         = var.environment
  owner               = var.owner
  cost_center         = var.cost_center
  github_deploy_repo  = var.github_deploy_repo
  github_scan_repo    = var.github_scan_repo
  openai_api_key      = var.openai_api_key
  allowed_cidr_blocks = var.allowed_cidr_blocks
}
