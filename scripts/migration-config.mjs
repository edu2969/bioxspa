#!/usr/bin/env node

/**
 * BIOX - Script de Configuración de Migración
 * Permite habilitar/deshabilitar gradualmente las funciones de Supabase
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ENV_FILE = '.env.local';
const ENV_EXAMPLE = '.env.example';

// Configuraciones disponibles
const MIGRATION_FLAGS = {
  USE_SUPABASE: 'Habilitar Supabase como sistema principal',
  MIGRATE_AUTH: 'Migrar sistema de autenticación',
  MIGRATE_CLIENTS: 'Migrar gestión de clientes',
  MIGRATE_INVENTORY: 'Migrar gestión de inventario',
  MIGRATE_SALES: 'Migrar gestión de ventas',
  MIGRATE_DISPATCH: 'Migrar sistema de despacho',
  MIGRATE_BI: 'Migrar business intelligence',
  MIGRATION_DEBUG: 'Habilitar logs detallados de migración'
};

class MigrationConfig {
  constructor() {
    this.envPath = join(process.cwd(), ENV_FILE);
    this.examplePath = join(process.cwd(), ENV_EXAMPLE);
    this.currentConfig = this.loadCurrentConfig();
  }

  loadCurrentConfig() {
    if (!existsSync(this.envPath)) {
      console.log('📄 Archivo .env.local no existe, creando desde ejemplo...');
      this.createFromExample();
    }

    try {
      const envContent = readFileSync(this.envPath, 'utf8');
      const config = {};
      
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          config[key.trim()] = value.trim();
        }
      });

      return config;
    } catch (error) {
      console.error('❌ Error leyendo archivo .env.local:', error);
      return {};
    }
  }

  createFromExample() {
    if (!existsSync(this.examplePath)) {
      console.log('⚠️ Archivo .env.example no existe, creando configuración básica...');
      this.createBasicConfig();
      return;
    }

    try {
      const exampleContent = readFileSync(this.examplePath, 'utf8');
      writeFileSync(this.envPath, exampleContent);
      console.log('✅ Archivo .env.local creado desde ejemplo');
    } catch (error) {
      console.error('❌ Error creando .env.local:', error);
      this.createBasicConfig();
    }
  }

  createBasicConfig() {
    const basicConfig = `# BIOX - Configuración de Migración
# MongoDB (legacy)
MONGODB_URI=mongodb://localhost:27017/biox

# NextAuth (legacy)
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://localhost:3001

# Supabase (nuevo sistema)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Configuración de migración
USE_SUPABASE=false
MIGRATE_AUTH=false
MIGRATE_CLIENTS=false
MIGRATE_INVENTORY=false
MIGRATE_SALES=false
MIGRATE_DISPATCH=false
MIGRATE_BI=false
MIGRATION_DEBUG=true

# SII (no afectado por migración)
SII_AMBIENTE=CERTIFICACION
SII_RUT_EMPRESA=76123456-7
SII_NOMBRE_EMPRESA=BIOX SPA
`;

    writeFileSync(this.envPath, basicConfig);
    console.log('✅ Configuración básica creada en .env.local');
  }

  updateFlag(flag, value) {
    try {
      let envContent = readFileSync(this.envPath, 'utf8');
      
      const flagPattern = new RegExp(`^${flag}=.*$`, 'm');
      const newLine = `${flag}=${value}`;
      
      if (flagPattern.test(envContent)) {
        envContent = envContent.replace(flagPattern, newLine);
      } else {
        envContent += `\n${newLine}`;
      }
      
      writeFileSync(this.envPath, envContent);
      this.currentConfig[flag] = value;
      
      console.log(`✅ ${flag} = ${value}`);
      return true;
    } catch (error) {
      console.error(`❌ Error actualizando ${flag}:`, error);
      return false;
    }
  }

  showCurrentStatus() {
    console.log('\n📊 Estado Actual de la Migración:\n');
    
    Object.entries(MIGRATION_FLAGS).forEach(([flag, description]) => {
      const currentValue = this.currentConfig[flag] || 'false';
      const status = currentValue === 'true' ? '✅ HABILITADO' : '❌ DESHABILITADO';
      console.log(`${status} ${flag}: ${description}`);
    });
    
    console.log('\n');
  }

  enableAll() {
    console.log('🚀 Habilitando todas las funciones de migración...\n');
    
    let success = true;
    Object.keys(MIGRATION_FLAGS).forEach(flag => {
      if (!this.updateFlag(flag, 'true')) {
        success = false;
      }
    });
    
    if (success) {
      console.log('\n✅ Todas las funciones de migración habilitadas');
      console.log('⚠️  Asegúrate de tener configuradas las variables de Supabase');
    }
  }

  disableAll() {
    console.log('⏪ Deshabilitando todas las funciones de migración...\n');
    
    let success = true;
    Object.keys(MIGRATION_FLAGS).forEach(flag => {
      if (!this.updateFlag(flag, 'false')) {
        success = false;
      }
    });
    
    if (success) {
      console.log('\n✅ Todas las funciones de migración deshabilitadas');
      console.log('📄 Sistema funcionando con MongoDB y NextAuth');
    }
  }

  enableAuth() {
    console.log('🔐 Habilitando migración de autenticación...\n');
    
    const authFlags = ['USE_SUPABASE', 'MIGRATE_AUTH', 'MIGRATION_DEBUG'];
    let success = true;
    
    authFlags.forEach(flag => {
      if (!this.updateFlag(flag, 'true')) {
        success = false;
      }
    });
    
    if (success) {
      console.log('\n✅ Migración de autenticación habilitada');
      console.log('🔧 Necesitas configurar:');
      console.log('  - NEXT_PUBLIC_SUPABASE_URL');
      console.log('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
      console.log('  - SUPABASE_SERVICE_ROLE_KEY');
    }
  }

  checkSupabaseConfig() {
    console.log('🔍 Verificando configuración de Supabase...\n');
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const missing = requiredVars.filter(varName => 
      !this.currentConfig[varName] || this.currentConfig[varName].trim() === ''
    );
    
    if (missing.length === 0) {
      console.log('✅ Configuración de Supabase completa');
    } else {
      console.log('⚠️  Variables faltantes:');
      missing.forEach(varName => console.log(`   - ${varName}`));
      console.log('\n🔧 Configura estas variables antes de habilitar Supabase');
    }
  }
}

// Función principal
function main() {
  const config = new MigrationConfig();
  const command = process.argv[2];
  
  console.log('🔄 BIOX - Configurador de Migración\n');
  
  switch (command) {
    case 'status':
      config.showCurrentStatus();
      break;
      
    case 'enable-all':
      config.enableAll();
      break;
      
    case 'disable-all':
      config.disableAll();
      break;
      
    case 'enable-auth':
      config.enableAuth();
      break;
      
    case 'check-supabase':
      config.checkSupabaseConfig();
      break;
      
    case 'help':
    default:
      console.log('Comandos disponibles:\n');
      console.log('  status        - Mostrar estado actual');
      console.log('  enable-all    - Habilitar todas las funciones');
      console.log('  disable-all   - Deshabilitar todas las funciones');
      console.log('  enable-auth   - Habilitar solo autenticación');
      console.log('  check-supabase - Verificar configuración de Supabase');
      console.log('  help          - Mostrar esta ayuda\n');
      console.log('Ejemplo: node scripts/migration-config.mjs status');
      break;
  }
}

main();