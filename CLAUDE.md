# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

学生考评积分管理系统 - A local web application for managing student daily evaluation scores. Uses OCR to parse evaluation images and track bonus/penalty points.

## Commands

### Development
```bash
# Start development server (creates venv, installs deps, runs migrations)
./start.sh

# Manual setup
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Database
```bash
python manage.py makemigrations
python manage.py migrate
```

### Static Files
```bash
python manage.py collectstatic
```

## Architecture

### Backend Structure
- **Django 4.2** with SQLite database
- **API-only backend**: All views return JSON responses (no server-side template rendering for pages)
- Single Django app: `core/`

### Key Models (`core/models.py`)
- `Student`: name, is_focused, computed total_score property
- `ScoreRecord`: student FK, date, type (bonus/penalty), item, score
- `Config`: key-value store for system settings (API key, model name)

### Frontend (`templates/index.html`)
- Single-page application with tab navigation
- Pure HTML/CSS/JavaScript (no framework)
- ECharts for score visualization
- All UI state managed in JavaScript

### API Endpoints (`core/urls.py`)
All routes prefixed with `/api/`:
- OCR: `POST /parse/`
- Records: CRUD operations at `/records/`
- Students: CRUD operations at `/students/`
- Config: GET/PUT at `/config/<key>/`

### OCR Service (`core/services/ocr_service.py`)
- Uses SiliconFlow API (Qwen VL vision models)
- API key configurable via database (Config model) or environment variable
- Returns parsed JSON with students, bonus/penalty items, and net scores
- Includes retry mechanism for network failures

## Data Flow

1. User uploads image → OCR service parses it
2. Parsed JSON shown for editing/confirmation
3. On save: Students auto-created, ScoreRecords created for each bonus/penalty item
4. Dashboard shows daily/cumulative scores via ECharts

## Configuration

- Environment variables in `.env` (see `.env.example`)
- Runtime config stored in `Config` model (API key, model name)
- Database config takes precedence over environment variables