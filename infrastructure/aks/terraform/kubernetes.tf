locals {
  service_env = {
    frontend = [
      { name = "SERVICE_NAME", value = "frontend" },
      { name = "ENVIRONMENT", value = var.environment },
      { name = "AZURE_REGION", value = var.location },
      { name = "DEPLOYMENT_ID", value = local.name_prefix },
      { name = "LOG_FORMAT", value = "json" },
      { name = "CHAT_SERVICE_URL", value = local.internal_service_urls.chat-rag },
      { name = "BOARD_SERVICE_URL", value = local.internal_service_urls.board-generator },
      { name = "ORDER_WEBHOOK_URL", value = module.workshop.order_webhook_url },
      { name = "NEXT_PUBLIC_APP_ENV", value = var.environment },
    ]
    chat-rag = [
      { name = "SERVICE_NAME", value = "chat-rag" },
      { name = "ENVIRONMENT", value = var.environment },
      { name = "AZURE_REGION", value = var.location },
      { name = "DEPLOYMENT_ID", value = local.name_prefix },
      { name = "LOG_FORMAT", value = "json" },
      { name = "AI_MODEL_CHAT", value = "gpt-4o-mini" },
      { name = "AI_MODEL_EMBED", value = "text-embedding-3-small" },
    ]
    board-generator = [
      { name = "SERVICE_NAME", value = "board-generator" },
      { name = "ENVIRONMENT", value = var.environment },
      { name = "AZURE_REGION", value = var.location },
      { name = "DEPLOYMENT_ID", value = local.name_prefix },
      { name = "LOG_FORMAT", value = "json" },
      { name = "AZURE_STORAGE_ACCOUNT", value = module.workshop.board_images_storage_account },
      { name = "AZURE_STORAGE_CONTAINER", value = module.workshop.board_images_container },
      { name = "AI_MODEL", value = "gpt-image-1" },
    ]
  }
}

resource "kubernetes_namespace" "app" {
  metadata {
    name = local.namespace
    labels = {
      app = local.name_prefix
    }
  }

  depends_on = [azurerm_kubernetes_cluster.main]
}

resource "kubernetes_secret" "openai" {
  metadata {
    name      = "openai-api-key"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    OPENAI_API_KEY = var.openai_api_key
  }

  type = "Opaque"
}

resource "kubernetes_service_account" "app" {
  metadata {
    name      = "app"
    namespace = kubernetes_namespace.app.metadata[0].name
    annotations = {
      "azure.workload.identity/client-id" = azurerm_user_assigned_identity.app.client_id
    }
    labels = {
      "azure.workload.identity/use" = "true"
    }
  }
}

resource "kubernetes_deployment" "services" {
  for_each = local.services

  metadata {
    name      = each.key
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = {
      app = each.key
    }
  }

  spec {
    replicas = var.desired_count

    selector {
      match_labels = {
        app = each.key
      }
    }

    template {
      metadata {
        labels = {
          app                           = each.key
          "azure.workload.identity/use" = "true"
        }
      }

      spec {
        service_account_name = kubernetes_service_account.app.metadata[0].name

        container {
          name  = each.key
          image = "${module.workshop.acr_repository_urls[each.key]}:${var.image_tag}"

          command = each.value.command

          dynamic "port" {
            for_each = [each.value.port]
            content {
              container_port = port.value
              protocol       = "TCP"
            }
          }

          dynamic "env" {
            for_each = local.service_env[each.key]
            content {
              name  = env.value.name
              value = env.value.value
            }
          }

          env {
            name = "OPENAI_API_KEY"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.openai.metadata[0].name
                key  = "OPENAI_API_KEY"
              }
            }
          }

          readiness_probe {
            http_get {
              path = each.key == "frontend" ? "/api/security/posture" : "/health"
              port = each.value.port
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          liveness_probe {
            http_get {
              path = each.key == "frontend" ? "/api/security/posture" : "/health"
              port = each.value.port
            }
            initial_delay_seconds = 60
            period_seconds        = 30
          }
        }
      }
    }
  }
}

resource "kubernetes_service" "services" {
  for_each = local.services

  metadata {
    name      = each.key
    namespace = kubernetes_namespace.app.metadata[0].name
    labels = {
      app = each.key
    }
  }

  spec {
    type = each.value.public ? "LoadBalancer" : "ClusterIP"

    selector = {
      app = each.key
    }

    port {
      port        = each.value.public ? 80 : each.value.port
      target_port = each.value.port
      protocol    = "TCP"
    }
  }
}
