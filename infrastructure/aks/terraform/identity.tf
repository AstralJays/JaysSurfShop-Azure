resource "azurerm_key_vault_access_policy" "app" {
  key_vault_id = module.workshop.key_vault_id
  tenant_id    = module.workshop.tenant_id
  object_id    = azurerm_user_assigned_identity.app.principal_id

  secret_permissions = ["Get", "List"]
}

resource "kubernetes_secret" "leaked_sp" {
  metadata {
    name      = "leaked-sp-credentials"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    "leaked-sp.json" = module.workshop.leaked_sp_credentials_json
  }

  type = "Opaque"
}
