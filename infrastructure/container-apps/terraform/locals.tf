locals {
  name_prefix = module.workshop.name_prefix

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
