# Smart Study Portal (Smart Edu) — Disaster Recovery Runbook

## 1. Disaster Recovery Objectives & SLA

| Metric | Target | Description |
|---|---|---|
| **Recovery Time Objective (RTO)** | **< 15 minutes** | Maximum allowable platform downtime during catastrophic failure. |
| **Recovery Point Objective (RPO)** | **< 1 hour** | Maximum allowable data loss window (hourly differential snapshots). |
| **Integrity Target** | **100% Fidelity** | Zero data loss in relational truth; complete cross-tenant vector isolation intact. |

---

## 2. Backup Architecture & Snapshot Schedule

### 2.1 Scheduled Backup Jobs
1. **Hourly MySQL Logical Backup:**
   ```bash
   mysqldump -u root -h 127.0.0.1 -P 3307 --no-tablespaces --single-transaction --databases smart_study | gzip > /backups/mysql/smart_study_$(date +%Y%m%d_%H%M%S).sql.gz
   ```
2. **Daily ChromaDB Filesystem Snapshot:**
   ```bash
   rsync -av --delete /opt/smart-study/ml/chroma_data/ /backups/chroma_data_snapshot/
   ```
3. **Daily Uploaded Documents Snapshot:**
   ```bash
   rsync -av --delete /data/uploads/ /backups/uploads_snapshot/
   ```

---

## 3. Disaster Recovery Procedures

### Scenario A: Complete Host Failure (Bare-Metal Rebuild)
1. Provision replacement server with Ubuntu 22.04 LTS / 24.04 LTS.
2. Install Docker, Docker Compose, Git, and NVIDIA Drivers.
3. Clone repository and restore environment file:
   ```bash
   git clone -b production-hardening <REPO_URL> /opt/smart-study
   cd /opt/smart-study
   # Restore secure .env.production from vault
   ```
4. Restore MySQL Database:
   ```bash
   docker compose up -d mysql
   # Wait for MySQL healthcheck (5-10s)
   gunzip -c /backups/mysql/latest.sql.gz | docker compose exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" smart_study
   ```
5. Restore ChromaDB Vector Store:
   ```bash
   rsync -av /backups/chroma_data_snapshot/ /opt/smart-study/ml/chroma_data/
   ```
6. Restore Uploaded Materials:
   ```bash
   rsync -av /backups/uploads_snapshot/ /data/uploads/
   ```
7. Start all application services:
   ```bash
   docker compose up -d
   ```
8. Verify platform health using composite verification script:
   ```bash
   python scratch/test_backup_and_recovery.py
   ```

---

### Scenario B: Database Corruption Recovery
1. Stop incoming API traffic:
   ```bash
   docker compose stop api
   ```
2. Drop and recreate corrupted database:
   ```sql
   DROP DATABASE smart_study;
   CREATE DATABASE smart_study CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Restore the most recent verified SQL backup:
   ```bash
   gunzip -c /backups/mysql/smart_study_20261101_020000.sql.gz | mysql -u root -P 3307 -h 127.0.0.1 smart_study
   ```
4. Run Flyway schema repair / validation:
   ```bash
   cd /opt/smart-study/backend
   ./mvnw flyway:repair flyway:validate
   ```
5. Restart Spring Boot API Gateway:
   ```bash
   docker compose start api
   ```

---

### Scenario C: Vector Store (ChromaDB) Corruption Recovery
1. Stop FastAPI ML Service:
   ```bash
   docker compose stop ml
   ```
2. Restore vector store from previous daily snapshot:
   ```bash
   rm -rf /opt/smart-study/ml/chroma_data
   cp -r /backups/chroma_data_snapshot /opt/smart-study/ml/chroma_data
   ```
3. Re-index any student documents uploaded since the snapshot:
   - Query MySQL for materials completed after snapshot timestamp:
     ```sql
     SELECT id, file_name FROM materials WHERE status = 'COMPLETED' AND created_at > '<SNAPSHOT_TIME>';
     ```
   - Execute internal re-indexing job via FastAPI `/ml/v1/index-material`.
4. Restart FastAPI ML Service:
   ```bash
   docker compose start ml
   ```
5. Run RAG isolation and smoke tests:
   ```bash
   python scratch/test_milestone_6_rag_suite.py
   ```

---

## 4. Verification & Validation Protocol

After executing any disaster recovery procedure, run the automated verification suite:

```bash
# 1. Verify all 5 services online and responsive
python scratch/test_backup_and_recovery.py

# 2. Verify RAG security and subject isolation
python scratch/test_milestone_6_rag_suite.py

# 3. Verify user authentication and database consistency
python scratch/test_regression_suite.py
```
All tests must report `PASS` with zero failures before declaring production restored.

