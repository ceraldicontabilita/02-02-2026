#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Miglioramento pagina Documenti: 1) Periodo sync ridotto a 10 giorni, 2) Campi separati per keyword personalizzate, 3) Download in background con popup stato"

frontend:
  - task: "Code Splitting con React.lazy + Suspense"
    implemented: true
    working: true
    file: "frontend/src/main.jsx"
    priority: "high"
    status_history:
      - working: true
        agent: "main"
        comment: "40+ pagine lazy loaded con React.lazy() e Suspense"

  - task: "React Query per caching API"
    implemented: true
    working: true
    file: "frontend/src/lib/queryClient.js"
    priority: "high"
    status_history:
      - working: true
        agent: "main"
        comment: "QueryClient configurato con cache 5min, GC 30min"

  - task: "Zustand Store Prima Nota"
    implemented: true
    working: true
    file: "frontend/src/stores/primaNotaStore.js"
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "testing"
        comment: "SUCCESS: Filtri periodo funzionanti, bottoni esclusione anni 2018-2022 con cambio stato visivo, card riepilogo arancione presente"

  - task: "Refactoring GestioneDipendenti"
    implemented: true
    working: true
    file: "frontend/src/pages/GestioneDipendenti.jsx"
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Da 2627 a 374 righe (-86%). Tab estratti in componenti separati"
      - working: true
        agent: "testing"
        comment: "FINAL TEST SUCCESS: Tutti i 4 tab funzionanti (Anagrafica, Contratti, Prima Nota, Libro Unico). KPI cards, filtri, bottoni, modal, React Query caching - tutto perfetto. Nessun errore JavaScript."

  - task: "Pagina Documenti - Download background e keyword"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/Documenti.jsx"
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implementato: 1) Default 10 giorni, 2) Campo keyword personalizzate con varianti, 3) Download in background con polling stato task, 4) Popup visivo durante download"

metadata:
  created_by: "main_agent"
  version: "4.0"
  test_sequence: 4
  run_ui: true

test_plan:
  current_focus:
    - "Pagina Documenti - verifica download in background"
    - "Verifica campo keyword personalizzate"
  test_all: false

agent_communication:
  - agent: "main"
    message: "Implementate le modifiche richieste alla pagina Documenti: 1) Periodo default ridotto a 10 giorni con opzione nel dropdown, 2) Sezione keyword personalizzate con campo input e lista con checkbox, 3) Download in background con endpoint /api/documenti/scarica-da-email?background=true e polling stato task. TEST DA FARE: a) Aprire pagina documenti, b) Cliccare Impostazioni, c) Verificare periodo default 10 giorni, d) Aggiungere keyword personalizzata, e) Selezionare keyword, f) Cliccare 'Scarica da Email' e verificare popup stato in background"