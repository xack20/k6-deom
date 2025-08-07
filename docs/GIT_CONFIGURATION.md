# Git Configuration Documentation

## .gitignore Coverage

This project uses a comprehensive `.gitignore` file that covers both the NestJS backend and K6 testing components.

### 🎯 What's Ignored

#### NestJS Backend (`/backend/`)
- **Build outputs**: `dist/`, `build/`, compiled TypeScript files
- **Dependencies**: `node_modules/`, package lock files
- **Environment files**: `.env*` files containing secrets
- **Logs**: Application logs, debug files
- **Database files**: SQLite, local database files
- **Uploads**: User-uploaded files and temp uploads
- **Cache**: TypeScript build cache, ESLint cache

#### K6 Testing (`/k6-tests/`)
- **Result files**: JSON outputs in root (organized in `/reports/` now)
- **Temporary data**: Large generated datasets, temp files
- **Screenshots/Videos**: Browser test artifacts
- **Metrics exports**: Prometheus, Grafana outputs
- **Cache files**: K6 temporary and cache directories

#### General Exclusions
- **IDE files**: VSCode, IntelliJ, Sublime configurations
- **OS files**: `.DS_Store`, `Thumbs.db`, Linux temp files
- **Security**: Certificates, JWT secrets, API keys
- **Documentation**: Generated docs, coverage reports
- **Docker**: Data volumes, temporary containers

### ✅ What's Included (Force Include)

```bash
# Important files that are kept even if they match ignore patterns
!k6-tests/reports/README.md          # Reports documentation
!k6-tests/config/environment.example.js  # Example configurations
!backend/config/database.example.js      # Database config template
!README.md                               # Project documentation
!LICENSE                                 # License file
!.gitkeep                               # Directory placeholders
!*.example.*                            # Example and template files
```

### 📁 Directory Structure Impact

```
k6-deom/
├── .gitignore                  ✅ Tracks comprehensive ignore rules
├── backend/
│   ├── src/                   ✅ All source code tracked
│   ├── dist/                  ❌ Build output ignored
│   ├── node_modules/          ❌ Dependencies ignored
│   ├── .env                   ❌ Environment secrets ignored
│   └── package.json           ✅ Configuration tracked
├── k6-tests/
│   ├── tests/                 ✅ All test scripts tracked
│   ├── reports/
│   │   ├── performance/       ✅ Current reports tracked
│   │   ├── analysis/          ✅ Analysis reports tracked
│   │   ├── archived/          ✅ Directory tracked with .gitkeep
│   │   └── README.md          ✅ Documentation tracked
│   ├── config/                ✅ Configuration files tracked
│   ├── utils/                 ✅ Utility scripts tracked
│   ├── data/large-dataset*    ❌ Large datasets ignored
│   └── *.json (in root)       ❌ Old result files ignored
└── documentation/             ✅ All docs tracked
```

### 🛠️ Git Best Practices for This Project

#### Initial Setup
```bash
# Initialize git repository
git init

# Add all files (gitignore will handle exclusions)
git add .

# Initial commit
git commit -m "Initial commit: K6 demo project with NestJS backend"
```

#### Working with Reports
```bash
# Reports are organized and tracked
git add k6-tests/reports/performance/
git add k6-tests/reports/analysis/

# Large datasets are ignored automatically
# No need to worry about accidentally committing large JSON files
```

#### Environment Configuration
```bash
# Copy example configurations
cp backend/config/database.example.js backend/config/database.js
cp k6-tests/config/environment.example.js k6-tests/config/environment.js

# Edit with your settings (these files will be ignored)
```

#### Security Best Practices
```bash
# These are automatically ignored:
backend/.env                    # Database credentials, JWT secrets
backend/uploads/               # User uploaded files
k6-tests/data/api-keys.json   # API testing credentials
*.pem, *.key                  # SSL certificates
```

### 🔍 Checking Git Status

After setting up the gitignore, you should see:

```bash
$ git status
On branch main
Untracked files:
  (use "git add <file>..." to include in what will be committed)
        .gitignore
        BACKEND_OPTIMIZATION_SUMMARY.md
        K6_CAPABILITIES_DEMO.md
        REPORTS_ORGANIZATION_SUMMARY.md
        backend/src/
        backend/package.json
        backend/tsconfig.json
        k6-tests/tests/
        k6-tests/reports/
        k6-tests/config/
        k6-tests/manage-reports.sh
        
# Large files, logs, and sensitive data should NOT appear here
```

### 🚨 Important Notes

1. **Never commit sensitive data**:
   - API keys, passwords, JWT secrets
   - Database credentials
   - SSL certificates

2. **Large files policy**:
   - K6 result JSONs in root are ignored
   - Use `/reports/` folder for organized, trackable results
   - Large datasets (>10MB) are automatically ignored

3. **IDE configurations**:
   - Personal IDE settings are ignored
   - Shared project settings can be tracked by force-including specific files

4. **Docker considerations**:
   - Docker files are tracked (for deployment)
   - Docker data volumes are ignored
   - Add `!Dockerfile` and `!docker-compose.yml` if using containers

### 📝 Customization

To add project-specific ignore patterns:

```bash
# Add to .gitignore
echo "custom-temp-folder/" >> .gitignore
echo "personal-notes.md" >> .gitignore
```

To force-include a file that's being ignored:

```bash
# Add to .gitignore
echo "!important-file-to-keep.json" >> .gitignore
```

This gitignore setup ensures a clean, secure, and maintainable git repository for both development and production environments!
