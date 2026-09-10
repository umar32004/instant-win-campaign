// =============================================================================
// Hayatna Instant Win Campaign — Azure Infrastructure
// Provisions: App Service (Linux, Node 20), Azure SQL Database, Storage
// Account + private blob container, Azure AI Document Intelligence, Key
// Vault, and Application Insights. Deploy with:
//
//   az deployment group create \
//     --resource-group <rg-name> \
//     --template-file infra/main.bicep \
//     --parameters @infra/main.parameters.json
//
// Secrets (SQL admin password, JWT secrets) are NOT set here — after
// deployment, populate them in the created Key Vault, then wire App
// Service settings to `@Microsoft.KeyVault(SecretUri=...)` references
// (the App Service's system-assigned managed identity is granted "get"
// access to the vault by this template).
// =============================================================================

@description('Short, unique prefix for all resource names, e.g. "hayatna-prod"')
param namePrefix string

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('SQL Server administrator login name')
param sqlAdminLogin string = 'hayatnaadmin'

@secure()
@description('SQL Server administrator password — pass via parameter file or --parameters at deploy time, never commit it')
param sqlAdminPassword string

@description('App Service Plan SKU')
param appServicePlanSku string = 'P1v3'

var storageAccountName = replace('${namePrefix}stor', '-', '')
var sqlServerName = '${namePrefix}-sql'
var sqlDatabaseName = 'hayatna_campaign'
var appServicePlanName = '${namePrefix}-plan'
var webAppName = '${namePrefix}-app'
var keyVaultName = '${namePrefix}-kv'
var docIntelName = '${namePrefix}-docintel'
var appInsightsName = '${namePrefix}-insights'
var logAnalyticsName = '${namePrefix}-logs'

// ---------------------------------------------------------------------------
// Storage Account + private receipts container
// ---------------------------------------------------------------------------
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: take(storageAccountName, 24)
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-01-01' = {
  parent: storageAccount
  name: 'default'
}

resource receiptsContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  parent: blobService
  name: 'receipts'
  properties: {
    publicAccess: 'None'
  }
}

// ---------------------------------------------------------------------------
// Azure SQL
// ---------------------------------------------------------------------------
resource sqlServer 'Microsoft.Sql/servers@2023-05-01-preview' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: sqlAdminLogin
    administratorLoginPassword: sqlAdminPassword
    minimalTlsVersion: '1.2'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-05-01-preview' = {
  parent: sqlServer
  name: sqlDatabaseName
  location: location
  sku: {
    name: 'S1'
    tier: 'Standard'
  }
}

resource sqlAllowAzureServices 'Microsoft.Sql/servers/firewallRules@2023-05-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// ---------------------------------------------------------------------------
// Azure AI Document Intelligence
// ---------------------------------------------------------------------------
resource documentIntelligence 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: docIntelName
  location: location
  kind: 'FormRecognizer'
  sku: { name: 'S0' }
  properties: {
    publicNetworkAccess: 'Enabled'
    customSubDomainName: docIntelName
  }
}

// ---------------------------------------------------------------------------
// Log Analytics + Application Insights
// ---------------------------------------------------------------------------
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
  }
}

// ---------------------------------------------------------------------------
// App Service (Linux, Node 20)
// ---------------------------------------------------------------------------
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  sku: { name: appServicePlanSku }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: webAppName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appSettings: [
        { name: 'NODE_ENV', value: 'production' }
        { name: 'USE_MOCK_CLOUD_SERVICES', value: 'false' }
        { name: 'AZURE_STORAGE_ACCOUNT_NAME', value: storageAccount.name }
        { name: 'AZURE_STORAGE_CONTAINER_RECEIPTS', value: 'receipts' }
        { name: 'AZURE_DOCINTEL_ENDPOINT', value: documentIntelligence.properties.endpoint }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appInsights.properties.ConnectionString }
        // AZURE_STORAGE_CONNECTION_STRING, AZURE_DOCINTEL_KEY, DATABASE_URL,
        // JWT_ACCESS_SECRET, JWT_REFRESH_SECRET are populated post-deploy as
        // Key Vault references — see docs/DEPLOYMENT.md.
      ]
    }
  }
}

// ---------------------------------------------------------------------------
// Key Vault (App Service managed identity granted read access)
// ---------------------------------------------------------------------------
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: false
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: webApp.identity.principalId
        permissions: {
          secrets: ['get', 'list']
        }
      }
    ]
  }
}

output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output storageAccountName string = storageAccount.name
output sqlServerFqdn string = sqlServer.properties.fullyQualifiedDomainName
output documentIntelligenceEndpoint string = documentIntelligence.properties.endpoint
output keyVaultName string = keyVault.name
