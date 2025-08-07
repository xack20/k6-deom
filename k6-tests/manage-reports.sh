#!/bin/bash

# K6 Reports Management Utility
# Usage: ./manage-reports.sh [command] [options]

REPORTS_DIR="./reports"
PERFORMANCE_DIR="$REPORTS_DIR/performance"
ANALYSIS_DIR="$REPORTS_DIR/analysis" 
ARCHIVED_DIR="$REPORTS_DIR/archived"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function show_help() {
    echo -e "${BLUE}K6 Reports Management Utility${NC}"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo -e "  ${GREEN}list${NC}           List all reports"
    echo -e "  ${GREEN}summary${NC}        Show performance summary"
    echo -e "  ${GREEN}archive${NC}        Archive old reports (older than 30 days)"
    echo -e "  ${GREEN}clean${NC}          Clean temporary files"
    echo -e "  ${GREEN}latest${NC}         Show latest test results"
    echo -e "  ${GREEN}compare${NC}        Compare two test results"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 summary"
    echo "  $0 archive"
    echo "  $0 latest load"
    echo "  $0 compare load-test-results.json stress-test-results.json"
}

function list_reports() {
    echo -e "${BLUE}📊 Available Reports${NC}"
    echo ""
    echo -e "${YELLOW}Performance Reports:${NC}"
    ls -la $PERFORMANCE_DIR/*.json 2>/dev/null | awk '{print "  " $9 " (" $5 " bytes, " $6 " " $7 " " $8 ")"}'
    echo ""
    echo -e "${YELLOW}Analysis Reports:${NC}"
    ls -la $ANALYSIS_DIR/*.json 2>/dev/null | awk '{print "  " $9 " (" $5 " bytes, " $6 " " $7 " " $8 ")"}'
    echo ""
    echo -e "${YELLOW}Archived Reports:${NC}"
    ls -la $ARCHIVED_DIR/*.json 2>/dev/null | awk '{print "  " $9 " (" $5 " bytes, " $6 " " $7 " " $8 ")"}'
}

function show_summary() {
    echo -e "${BLUE}📈 Performance Summary${NC}"
    echo ""
    
    for file in $PERFORMANCE_DIR/*.json; do
        if [ -f "$file" ]; then
            filename=$(basename "$file")
            echo -e "${GREEN}$filename:${NC}"
            
            # Extract key metrics using jq if available
            if command -v jq >/dev/null 2>&1; then
                echo "  Requests: $(jq -r '.metrics.http_reqs.count // "N/A"' "$file")"
                echo "  Avg Response Time: $(jq -r '.metrics.http_req_duration.avg // "N/A"' "$file")ms"
                echo "  P95 Response Time: $(jq -r '.metrics.http_req_duration["p(95)"] // "N/A"' "$file")ms"
                echo "  RPS: $(jq -r '.metrics.http_reqs.rate // "N/A"' "$file")"
                echo "  Error Rate: $(jq -r '.metrics.http_req_failed.rate // "N/A"' "$file")%"
            else
                echo "  (Install jq for detailed metrics)"
            fi
            echo ""
        fi
    done
}

function archive_old() {
    echo -e "${YELLOW}📦 Archiving old reports...${NC}"
    
    # Archive files older than 30 days
    find $PERFORMANCE_DIR -name "*.json" -mtime +30 -exec mv {} $ARCHIVED_DIR/ \;
    find $ANALYSIS_DIR -name "*.json" -mtime +30 -exec mv {} $ARCHIVED_DIR/ \;
    
    archived_count=$(find $ARCHIVED_DIR -name "*.json" -mtime -1 | wc -l)
    echo -e "${GREEN}✅ Archived $archived_count files${NC}"
}

function clean_temp() {
    echo -e "${YELLOW}🧹 Cleaning temporary files...${NC}"
    
    # Remove any temporary or backup files
    find $REPORTS_DIR -name "*.tmp" -delete
    find $REPORTS_DIR -name "*.bak" -delete
    find $REPORTS_DIR -name "*~" -delete
    
    echo -e "${GREEN}✅ Cleaned temporary files${NC}"
}

function show_latest() {
    test_type=${2:-""}
    echo -e "${BLUE}📋 Latest Test Results${NC}"
    
    if [ -n "$test_type" ]; then
        latest_file=$(ls -t $PERFORMANCE_DIR/*$test_type*.json 2>/dev/null | head -1)
        if [ -f "$latest_file" ]; then
            echo -e "${GREEN}Latest $test_type test:${NC} $(basename "$latest_file")"
            if command -v jq >/dev/null 2>&1; then
                jq -r '.metrics | to_entries[] | "\(.key): \(.value.avg // .value.count // .value.rate // .value)"' "$latest_file" | head -10
            else
                echo "File: $latest_file"
            fi
        else
            echo -e "${RED}❌ No $test_type test results found${NC}"
        fi
    else
        echo "Available test types:"
        ls $PERFORMANCE_DIR/*.json 2>/dev/null | sed 's/.*\///g' | sed 's/-test-results.json//g' | sort -u | sed 's/^/  /'
    fi
}

function compare_results() {
    file1="$PERFORMANCE_DIR/$2"
    file2="$PERFORMANCE_DIR/$3"
    
    if [ ! -f "$file1" ] || [ ! -f "$file2" ]; then
        echo -e "${RED}❌ One or both files not found${NC}"
        echo "Available files:"
        ls $PERFORMANCE_DIR/*.json | sed 's/.*\///g' | sed 's/^/  /'
        return 1
    fi
    
    echo -e "${BLUE}📊 Comparing Test Results${NC}"
    echo -e "${GREEN}File 1:${NC} $(basename "$file1")"
    echo -e "${GREEN}File 2:${NC} $(basename "$file2")"
    echo ""
    
    if command -v jq >/dev/null 2>&1; then
        echo -e "${YELLOW}Key Metrics Comparison:${NC}"
        echo "Metric | File 1 | File 2"
        echo "-------|--------|--------"
        echo "Requests | $(jq -r '.metrics.http_reqs.count // "N/A"' "$file1") | $(jq -r '.metrics.http_reqs.count // "N/A"' "$file2")"
        echo "Avg Response | $(jq -r '.metrics.http_req_duration.avg // "N/A"' "$file1")ms | $(jq -r '.metrics.http_req_duration.avg // "N/A"' "$file2")ms"
        echo "P95 Response | $(jq -r '.metrics.http_req_duration["p(95)"] // "N/A"' "$file1")ms | $(jq -r '.metrics.http_req_duration["p(95)"] // "N/A"' "$file2")ms"
        echo "RPS | $(jq -r '.metrics.http_reqs.rate // "N/A"' "$file1") | $(jq -r '.metrics.http_reqs.rate // "N/A"' "$file2")"
    else
        echo "Install jq for detailed comparison"
    fi
}

# Main script logic
case ${1:-help} in
    "list")
        list_reports
        ;;
    "summary")
        show_summary
        ;;
    "archive")
        archive_old
        ;;
    "clean")
        clean_temp
        ;;
    "latest")
        show_latest "$@"
        ;;
    "compare")
        compare_results "$@"
        ;;
    "help"|*)
        show_help
        ;;
esac
