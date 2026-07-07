locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project        = var.project_name
    Environment    = var.environment
    Owner          = var.owner
    Application    = "cspm-demo"
    CostCenter     = var.cost_center
    DataClass      = "internal"
    ManagedBy      = "terraform"
    SecurityReview = "required"
    Workshop       = "cloud-security-monitoring"
    Cloud          = "azure"
  }

  services = {
    frontend = {
      port  = 3000
      image = "frontend"
    }
    chat-rag = {
      port  = 8001
      image = "chat-rag"
    }
    board-generator = {
      port  = 8002
      image = "board-generator"
    }
  }

  acr_login_server = azurerm_container_registry.main.login_server
  unique_suffix    = random_string.suffix.result
}
