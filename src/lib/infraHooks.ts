/**
 * Hooks Infrastructure: Terraform & Molecule
 * Pour intégration CI/CD complète
 */

export function generateInfraHooks(): Record<string, string> {
  return {
    // Terraform Configuration
    'infra/terraform/main.tf': `# ════════════════════════════════════════════════════════════════
# Terraform Configuration for Ansible Infrastructure
# ════════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = var.tf_state_bucket
    key    = "ansible-infrastructure/terraform.tfstate"
    region = var.aws_region
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Ansible     = "true"
    }
  }
}

# ════════════════════════════════════════════════════════════════
# VPC & Networking
# ════════════════════════════════════════════════════════════════

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "\${var.project_name}-\${var.environment}-vpc"
  cidr = var.vpc_cidr

  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs

  enable_nat_gateway = true
  enable_vpn_gateway = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Terraform = "true"
    Environment = var.environment
  }
}

# ════════════════════════════════════════════════════════════════
# Security Groups
# ════════════════════════════════════════════════════════════════

resource "aws_security_group" "ansible_managed" {
  name_prefix = "\${var.project_name}-\${var.environment}-"
  description = "Security group for Ansible managed instances"
  vpc_id      = module.vpc.vpc_id

  # SSH (only from control plane)
  ingress {
    description = "SSH from control plane"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.control_plane_cidr]
  }

  # HTTP
  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress (allow all)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "\${var.project_name}-\${var.environment}-ansible-sg"
  }
}

# ════════════════════════════════════════════════════════════════
# EC2 Instances
# ════════════════════════════════════════════════════════════════

resource "aws_instance" "ansible_managed" {
  count = var.instance_count

  ami           = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_pair_name

  vpc_security_group_ids = [aws_security_group.ansible_managed.id]
  subnet_id              = element(module.vpc.public_subnets, count.index)

  root_block_device {
    volume_type = "gp3"
    volume_size = var.root_volume_size
    encrypted   = true
  }

  user_data = templatefile("\${path.module}/templates/user_data.sh", {
    hostname = "\${var.project_name}-\${var.environment}-\${count.index + 1}"
  })

  tags = {
    Name        = "\${var.project_name}-\${var.environment}-\${count.index + 1}"
    Environment = var.environment
    Role        = "ansible-managed"
    Index       = count.index
  }
}

# ════════════════════════════════════════════════════════════════
# Generate Ansible Inventory
# ════════════════════════════════════════════════════════════════

resource "local_file" "ansible_inventory" {
  content = templatefile("\${path.module}/templates/inventory.tpl", {
    instances = aws_instance.ansible_managed
    environment = var.environment
  })
  filename = "\${path.module}/../../inventories/\${var.environment}.ini"
}

# ════════════════════════════════════════════════════════════════
# Outputs
# ════════════════════════════════════════════════════════════════

output "instance_ids" {
  description = "IDs of the created instances"
  value       = aws_instance.ansible_managed[*].id
}

output "instance_public_ips" {
  description = "Public IPs of the instances"
  value       = aws_instance.ansible_managed[*].public_ip
}

output "instance_private_ips" {
  description = "Private IPs of the instances"
  value       = aws_instance.ansible_managed[*].private_ip
}

output "security_group_id" {
  description = "ID of the security group"
  value       = aws_security_group.ansible_managed.id
}

output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}
`,

    'infra/terraform/variables.tf': `variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (staging, production)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "tf_state_bucket" {
  description = "S3 bucket for Terraform state"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]
}

variable "control_plane_cidr" {
  description = "CIDR of the Ansible control plane"
  type        = string
  default     = "0.0.0.0/0"  # Change this in production!
}

variable "instance_count" {
  description = "Number of instances to create"
  type        = number
  default     = 2
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.medium"
}

variable "ami_id" {
  description = "AMI ID for instances"
  type        = string
}

variable "key_pair_name" {
  description = "Name of the SSH key pair"
  type        = string
}

variable "root_volume_size" {
  description = "Size of root volume in GB"
  type        = number
  default     = 30
}
`,

    'infra/terraform/terraform.tfvars.example': `# Example Terraform variables
project_name    = "myproject"
environment     = "production"
aws_region      = "us-east-1"
tf_state_bucket = "myproject-terraform-state"

# Network
vpc_cidr               = "10.0.0.0/16"
availability_zones     = ["us-east-1a", "us-east-1b"]
public_subnet_cidrs    = ["10.0.1.0/24", "10.0.2.0/24"]
private_subnet_cidrs   = ["10.0.101.0/24", "10.0.102.0/24"]
control_plane_cidr     = "203.0.113.0/24"  # Your IP range

# Instances
instance_count     = 3
instance_type      = "t3.medium"
ami_id             = "ami-0c55b159cbfafe1f0"  # Ubuntu 22.04 LTS
key_pair_name      = "myproject-key"
root_volume_size   = 30
`,

    'infra/terraform/templates/user_data.sh': `#!/bin/bash
set -e

# Set hostname
hostnamectl set-hostname \${hostname}

# Update system
apt-get update
apt-get upgrade -y

# Install Python for Ansible
apt-get install -y python3 python3-pip

# Configure SSH
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd

echo "Instance \${hostname} initialized successfully"
`,

    'infra/terraform/templates/inventory.tpl': `# Generated by Terraform
# Environment: \${environment}

[all:vars]
ansible_user=ubuntu
ansible_python_interpreter=/usr/bin/python3

%{ for instance in instances ~}
[\${environment}]
\${instance.tags["Name"]} ansible_host=\${instance.public_ip} private_ip=\${instance.private_ip}
%{ endfor ~}
`,

    // Molecule Configuration
    'infra/molecule/default/molecule.yml': `---
# ════════════════════════════════════════════════════════════════
# Molecule Configuration for Ansible Testing
# ════════════════════════════════════════════════════════════════

dependency:
  name: galaxy
  options:
    requirements-file: requirements.yml

driver:
  name: docker

platforms:
  - name: ubuntu22-instance
    image: geerlingguy/docker-ubuntu2204-ansible:latest
    pre_build_image: true
    privileged: true
    command: /lib/systemd/systemd
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:ro
    networks:
      - name: molecule-network

  - name: debian11-instance
    image: geerlingguy/docker-debian11-ansible:latest
    pre_build_image: true
    privileged: true
    command: /lib/systemd/systemd
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:ro
    networks:
      - name: molecule-network

provisioner:
  name: ansible
  playbooks:
    create: create.yml
    converge: converge.yml
    verify: verify.yml
    destroy: destroy.yml
  inventory:
    host_vars:
      ubuntu22-instance:
        ansible_python_interpreter: /usr/bin/python3
      debian11-instance:
        ansible_python_interpreter: /usr/bin/python3
  env:
    ANSIBLE_FORCE_COLOR: "true"

verifier:
  name: ansible

scenario:
  name: default
  test_sequence:
    - dependency
    - cleanup
    - destroy
    - syntax
    - create
    - prepare
    - converge
    - idempotence
    - side_effect
    - verify
    - cleanup
    - destroy
`,

    'infra/molecule/default/converge.yml': `---
- name: Converge
  hosts: all
  become: true

  pre_tasks:
    - name: Update apt cache
      apt:
        update_cache: yes
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"

  roles:
    - role: common
    - role: hardening
      vars:
        enable_firewall: false  # Docker doesn't support UFW
    - role: nginx
    - role: postgresql
`,

    'infra/molecule/default/verify.yml': `---
- name: Verify
  hosts: all
  gather_facts: true
  become: true

  tasks:
    - name: "✅ Vérifier que Nginx est installé"
      package:
        name: nginx
        state: present
      check_mode: yes
      register: nginx_check
      failed_when: nginx_check.changed

    - name: "✅ Vérifier que Nginx est démarré"
      service:
        name: nginx
        state: started
      check_mode: yes
      register: nginx_service
      failed_when: nginx_service.changed

    - name: "✅ Vérifier que PostgreSQL est installé"
      package:
        name: postgresql
        state: present
      check_mode: yes
      register: postgres_check
      failed_when: postgres_check.changed

    - name: "✅ Vérifier que PostgreSQL est démarré"
      service:
        name: postgresql
        state: started
      check_mode: yes
      register: postgres_service
      failed_when: postgres_service.changed

    - name: "✅ Vérifier que SSH est sécurisé"
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^PermitRootLogin'
        line: 'PermitRootLogin no'
      check_mode: yes
      register: ssh_config
      failed_when: ssh_config.changed

    - name: "📊 Afficher le résultat des tests"
      debug:
        msg:
          - "✅ Tous les tests sont passés avec succès !"
          - "Nginx: {{ 'OK' if not nginx_check.changed else 'FAIL' }}"
          - "PostgreSQL: {{ 'OK' if not postgres_check.changed else 'FAIL' }}"
          - "SSH Hardening: {{ 'OK' if not ssh_config.changed else 'FAIL' }}"
`,

    // GitLab CI/CD with Terraform & Molecule
    'infra/.gitlab-ci.yml': `# ════════════════════════════════════════════════════════════════
# GitLab CI/CD Pipeline with Terraform & Molecule
# ════════════════════════════════════════════════════════════════

stages:
  - lint
  - test
  - infrastructure
  - deploy
  - verify

variables:
  ANSIBLE_FORCE_COLOR: "true"
  TF_ROOT: infra/terraform

# ════════════════════════════════════════════════════════════════
# Lint Stage
# ════════════════════════════════════════════════════════════════

ansible-lint:
  stage: lint
  image: cytopia/ansible-lint:latest
  script:
    - ansible-lint site.yml
    - ansible-lint roles/*/tasks/*.yml
  allow_failure: true

yaml-lint:
  stage: lint
  image: cytopia/yamllint:latest
  script:
    - yamllint .
  allow_failure: true

terraform-fmt:
  stage: lint
  image: hashicorp/terraform:latest
  script:
    - cd $TF_ROOT
    - terraform fmt -check -recursive
  allow_failure: true

# ════════════════════════════════════════════════════════════════
# Test Stage (Molecule)
# ════════════════════════════════════════════════════════════════

molecule-test:
  stage: test
  image: quay.io/ansible/molecule:latest
  services:
    - docker:dind
  variables:
    DOCKER_HOST: tcp://docker:2375
    DOCKER_TLS_CERTDIR: ""
  before_script:
    - pip install molecule-docker
  script:
    - cd infra/molecule
    - molecule test
  only:
    - merge_requests
    - main

# ════════════════════════════════════════════════════════════════
# Infrastructure Stage (Terraform)
# ════════════════════════════════════════════════════════════════

terraform-validate:
  stage: infrastructure
  image: hashicorp/terraform:latest
  script:
    - cd $TF_ROOT
    - terraform init -backend=false
    - terraform validate

terraform-plan:
  stage: infrastructure
  image: hashicorp/terraform:latest
  before_script:
    - cd $TF_ROOT
    - terraform init
  script:
    - terraform plan -out=tfplan
  artifacts:
    paths:
      - $TF_ROOT/tfplan
  only:
    - main

terraform-apply:
  stage: infrastructure
  image: hashicorp/terraform:latest
  before_script:
    - cd $TF_ROOT
    - terraform init
  script:
    - terraform apply -auto-approve tfplan
  dependencies:
    - terraform-plan
  when: manual
  only:
    - main

# ════════════════════════════════════════════════════════════════
# Deploy Stage (Ansible)
# ════════════════════════════════════════════════════════════════

ansible-deploy-staging:
  stage: deploy
  image: cytopia/ansible:latest
  script:
    - ansible-playbook -i inventories/staging.ini site.yml --check
    - ansible-playbook -i inventories/staging.ini site.yml
  environment:
    name: staging
  only:
    - develop

ansible-deploy-production:
  stage: deploy
  image: cytopia/ansible:latest
  script:
    - ansible-playbook -i inventories/production.ini site.yml --check
    - ansible-playbook -i inventories/production.ini site.yml
  environment:
    name: production
  when: manual
  only:
    - main

# ════════════════════════════════════════════════════════════════
# Verify Stage
# ════════════════════════════════════════════════════════════════

health-check:
  stage: verify
  image: curlimages/curl:latest
  script:
    - |
      for ip in $(terraform output -json instance_public_ips | jq -r '.[]'); do
        echo "Checking http://$ip"
        curl -f -s -o /dev/null -w "%{http_code}\\n" "http://$ip" || exit 1
      done
  only:
    - main
`,

    'infra/README.md': `# Infrastructure Hooks: Terraform & Molecule

## Structure

\`\`\`
infra/
├── terraform/          # Infrastructure as Code
│   ├── main.tf         # Main Terraform config
│   ├── variables.tf    # Variables
│   ├── terraform.tfvars.example
│   └── templates/      # User data & inventory
├── molecule/           # Testing framework
│   └── default/        # Default scenario
│       ├── molecule.yml
│       ├── converge.yml
│       └── verify.yml
├── .gitlab-ci.yml      # CI/CD pipeline
└── README.md
\`\`\`

## Terraform

### Prérequis
\`\`\`bash
terraform --version  # >= 1.0
aws configure        # Configure AWS credentials
\`\`\`

### Utilisation

1. **Copier le fichier de variables**
\`\`\`bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Éditer terraform.tfvars avec vos valeurs
\`\`\`

2. **Initialiser Terraform**
\`\`\`bash
terraform init
\`\`\`

3. **Planifier l'infrastructure**
\`\`\`bash
terraform plan
\`\`\`

4. **Appliquer l'infrastructure**
\`\`\`bash
terraform apply
\`\`\`

5. **Détruire l'infrastructure** (si nécessaire)
\`\`\`bash
terraform destroy
\`\`\`

### Outputs

Terraform génère automatiquement:
- **Inventaire Ansible** dans \`inventories/\${environment}.ini\`
- **IPs publiques** des instances
- **IDs** de ressources AWS

## Molecule

### Prérequis
\`\`\`bash
pip install molecule molecule-docker
docker --version  # Requis pour les tests
\`\`\`

### Commandes

**Tester tous les rôles**
\`\`\`bash
cd infra/molecule
molecule test
\`\`\`

**Créer les instances de test**
\`\`\`bash
molecule create
\`\`\`

**Converger (appliquer les rôles)**
\`\`\`bash
molecule converge
\`\`\`

**Vérifier (tests)**
\`\`\`bash
molecule verify
\`\`\`

**Détruire les instances**
\`\`\`bash
molecule destroy
\`\`\`

**Cycle complet**
\`\`\`bash
molecule test
\`\`\`

### Tests effectués

Molecule vérifie:
- ✅ Installation des packages (nginx, postgresql)
- ✅ Services démarrés
- ✅ SSH sécurisé (PermitRootLogin no)
- ✅ Idempotence (pas de changements au 2ème run)

## CI/CD Pipeline

Le pipeline GitLab CI/CD exécute:

1. **Lint** (ansible-lint, yamllint, terraform fmt)
2. **Test** (Molecule)
3. **Infrastructure** (Terraform validate/plan/apply)
4. **Deploy** (Ansible playbooks)
5. **Verify** (Health checks HTTP)

### Variables CI/CD à configurer

Dans GitLab CI/CD Settings > Variables:
- \`AWS_ACCESS_KEY_ID\`
- \`AWS_SECRET_ACCESS_KEY\`
- \`AWS_DEFAULT_REGION\`
- \`TF_VAR_project_name\`
- \`TF_VAR_environment\`

## Workflow complet

\`\`\`bash
# 1. Provisionner l'infrastructure
cd infra/terraform
terraform apply

# 2. Attendre la génération de l'inventaire
ls ../../inventories/production.ini

# 3. Déployer avec Ansible
cd ../..
ansible-playbook -i inventories/production.ini site.yml

# 4. Vérifier
curl http://$(terraform output -raw instance_public_ips | head -1)
\`\`\`

## Avantages

✅ **Infrastructure as Code** (Terraform)
✅ **Tests automatisés** (Molecule)
✅ **CI/CD intégré** (GitLab CI)
✅ **Inventaire dynamique** (généré par Terraform)
✅ **Multi-environnement** (staging/production)
✅ **Rollback facile** (Terraform destroy/apply)
`
  };
}
