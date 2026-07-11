locals {
  name_prefix = module.workshop.name_prefix
  upwind_enabled = var.upwind_client_id != ""

  upwind_env = local.upwind_enabled ? [
    { name = "UPWIND_TRACER_REPORT_TO_BACKEND", value = "true" },
    { name = "UPWIND_TRACER_AUTH_ENDPOINT", value = "https://oauth.upwind.io/oauth/token" },
    { name = "UPWIND_TRACER_BACKEND_API_HOST", value = "https://agent.upwind.io" },
    { name = "UPWIND_TRACER_REGISTRATION_HOST", value = "https://agent.upwind.io" },
    { name = "UPWIND_CLOUD_PROVIDER", value = "azure" },
    { name = "UPWIND_CLOUD_ACCOUNT_ID", value = module.workshop.subscription_id },
    { name = "UPWIND_TRACER_EXTENDED_SYSCALLS", value = "true" },
    { name = "UPWIND_REGION", value = var.upwind_region },
  ] : []

  services = {
    frontend = {
      port    = 3000
      image   = "frontend"
      public  = true
      command = ["node", "server.js"]
      cpu     = 0.5
      memory  = "1Gi"
    }
    chat-rag = {
      port    = 8001
      image   = "chat-rag"
      public  = false
      command = ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
      cpu     = 0.5
      memory  = "1Gi"
    }
    board-generator = {
      port    = 8002
      image   = "board-generator"
      public  = false
      command = ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002"]
      cpu     = 0.5
      memory  = "1Gi"
    }
  }
}
