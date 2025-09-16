#!/bin/bash

# Automated Rollback Script for Skool Clone Web App
# Usage: ./scripts/rollback.sh [environment]
# Environments: staging, production
# Triggers: health_check_failure, manual

set -e  # Exit on any error

# Configuration - Load from environment or defaults
ENVIRONMENT=${1:-staging}
NAMESPACE="${ENVIRONMENT}-namespace"
DEPLOYMENT_NAME="web-app"
KUBECONFIG_PATH="${HOME}/.kube/config"
HEALTH_LIVENESS="/api/health/liveness"
HEALTH_READINESS="/api/health/readiness"
SERVICE_URL="https://$(kubectl get service web-app -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' || echo 'localhost:3000')"
TIMEOUT=300  # seconds
BACKUP_RETENTION=30  # days

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting rollback for environment: ${ENVIRONMENT}${NC}"

# Function to log messages
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
    exit 1
}

# Validate environment
if [[ ! "${ENVIRONMENT}" =~ ^(staging|production)$ ]]; then
    error "Invalid environment. Use 'staging' or 'production'."
fi

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    error "kubectl not found. Install it first."
fi

# Load kubeconfig
if [[ -f "${KUBECONFIG_PATH}" ]]; then
    export KUBECONFIG="${KUBECONFIG_PATH}"
else
    error "Kubeconfig not found at ${KUBECONFIG_PATH}"
fi

# Switch context to the environment namespace
kubectl config use-context "${ENVIRONMENT}-context" 2>/dev/null || {
    log "Using default context for ${ENVIRONMENT}"
}
kubectl config set-context --current --namespace="${NAMESPACE}"

# Pre-rollback health check (to confirm failure)
check_health() {
    local endpoint=$1
    local max_retries=3
    local retry=0
    while [[ $retry -lt $max_retries ]]; do
        if curl -f -m 10 "${SERVICE_URL}${endpoint}" > /dev/null 2>&1; then
            return 0  # Success
        fi
        retry=$((retry + 1))
        sleep 5
    done
    return 1  # Failure
}

log "Performing pre-rollback health check..."
if check_health "${HEALTH_LIVENESS}" || check_health "${HEALTH_READINESS}"; then
    log "Health checks passed. Rollback may not be necessary, but proceeding."
else
    log "Health checks failed - proceeding with rollback."
fi

# Perform rollback
log "Rolling back deployment ${DEPLOYMENT_NAME} to previous revision..."
kubectl rollout undo deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE} || error "Failed to rollback deployment"

# Wait for rollout to complete
log "Waiting for rollout to complete..."
kubectl rollout status deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE} --timeout=${TIMEOUT}s || error "Rollback rollout did not complete within timeout"

# Post-rollback health check
log "Performing post-rollback health check..."
sleep 10  # Give time for pods to stabilize
if ! check_health "${HEALTH_LIVENESS}" || ! check_health "${HEALTH_READINESS}"; then
    error "Post-rollback health checks failed. Manual intervention required."
fi

log "Post-rollback health checks passed."

# Clean up old backups (simple rsync-like, adjust for your backup system)
# Example: Delete backups older than retention period
find /backups/${ENVIRONMENT} -type f -mtime +${BACKUP_RETENTION} -delete 2>/dev/null || log "No old backups to clean up"

# Notify team (integrate with Slack/PagerDuty via env vars)
if [[ -n "${SLACK_WEBHOOK_URL}" ]]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{
            \"text\": \"Rollback completed successfully for ${ENVIRONMENT} environment. Deployment: ${DEPLOYMENT_NAME}\",
            \"channel\": \"#deployments\"
        }" \
        "${SLACK_WEBHOOK_URL}"
    log "Slack notification sent."
fi

if [[ -n "${PAGERDUTY_KEY}" ]]; then
    # PagerDuty event v2 API
    curl -H "Content-type: application/json" -X POST \
        -d "{
            \"routing_key\": \"${PAGERDUTY_KEY}\",
            \"event_action\": \"resolve\",
            \"payload\": {
                \"summary\": \"Rollback completed for ${ENVIRONMENT}\",
                \"severity\": \"info\",
                \"source\": \"Skool Clone CI/CD\"
            }
        }" \
        "https://events.pagerduty.com/v2/enqueue"
    log "PagerDuty notification sent."
fi

log -e "${GREEN}Rollback completed successfully for ${ENVIRONMENT}!${NC}"