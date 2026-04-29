

### ---

**Ticket 1: Core Environment & SFTP Setup**

* **Title:** Node.js environment setup & SFTP connection initialization  
* **User Story:** As a **Developer**, I want to **configure the server environment and SFTP access**, so that **the system can securely retrieve raw data files for processing.**  
* **Description:** Initialize the project repository, install dependencies (Node.js), and establish a secure connection to the client's SFTP server.  
* **Acceptance Criteria:** \* Node.js environment is configured and documented.  
  * SFTP credentials are encrypted/stored in environment variables.  
  * A successful "ping" or connection test to the SFTP server is logged.  
* **Estimate:** 6 Hours  
* **Priority:** High (Blocker)

### ---

**Ticket 2: Logic for Lien Filtering & Name Extraction**

* **Title:** Lien filtering logic & owner name extraction (doc-ver / nme-ver)  
* **User Story:** As a **System**, I want to **identify specific lien documents and extract owner names**, so that **we only process relevant records and maintain data accuracy.**  
* **Description:** Implement the logic to filter through document lists and extract names using the doc-ver and nme-ver protocols.  
* **Acceptance Criteria:**  
  * The system correctly filters out non-lien documents.  
  * Owner names are extracted without special character errors.  
  * Logic handles variations in document naming conventions.  
* **Estimate:** 6 Hours  
* **Priority:** High

### ---

**Ticket 3: Automated ZIP Retrieval & Extraction**

* **Title:** img.zip retrieval & selective lien PDF extraction  
* **User Story:** As a **System**, I want to **download and unzip only the required PDF files**, so that **we save bandwidth and storage space while preparing for AI processing.**  
* **Description:** Script to download img.zip from SFTP and extract only the specific PDFs identified in the filtering step.  
* **Acceptance Criteria:**  
  * img.zip is downloaded successfully.  
  * Only relevant PDFs are extracted to the temporary processing folder.  
  * System handles "file not found" errors gracefully.  
* **Estimate:** 6 Hours  
* **Priority:** Medium

### ---

**Ticket 4: AI-Powered Data Extraction**

* **Title:** PDF-to-text conversion & AI-powered data extraction (OpenAI)  
* **User Story:** As a **Data Processor**, I want to **convert PDFs to text and use AI to extract structured data**, so that **unstructured lien information becomes usable digital data.**  
* **Description:** Use OCR/PDF-to-text tools combined with OpenAI's API to pull specific fields (dates, amounts, addresses) from the PDFs.  
* **Acceptance Criteria:**  
  * PDFs are accurately converted to machine-readable text.  
  * OpenAI prompt returns JSON-formatted data for each document.  
  * Key data points (Lien amount, Grantor, Grantee) are captured.  
* **Estimate:** 8 Hours  
* **Priority:** High

### ---

**Ticket 5: CSV Generation & Cleanup**

* **Title:** CSV generation & automated file cleanup workflow  
* **User Story:** As a **Client**, I want to **receive a clean CSV file of results**, so that **I can import the data into my mailing software.**  
* **Description:** Consolidate AI results into a CSV file and delete temporary PDF/ZIP files after processing to keep the server clean.  
* **Acceptance Criteria:**  
  * CSV is generated with headers matching the client’s requirements.  
  * Temporary files are deleted immediately after CSV generation.  
  * CSV is stored in the designated "Output" folder.  
* **Estimate:** 4 Hours  
* **Priority:** Medium

### ---

**Ticket 6: Automation & Error Handling**

* **Title:** Cron scheduling, logging & error handling implementation  
* **User Story:** As an **Administrator**, I want the **system to run automatically and log errors**, so that **the process is hands-off and I am alerted to any failures.**  
* **Description:** Set up a Cron job for daily execution and implement a logging system to track successes and failures.  
* **Acceptance Criteria:**  
  * Cron job triggers the script at the scheduled time.  
  * Logs are written to a file or monitoring dashboard.  
  * Critical errors trigger a notification (Email/Slack).  
* **Estimate:** 5 Hours  
* **Priority:** Medium

### ---

**Ticket 7: QA & Final Delivery**

* **Title:** End-to-end testing, debugging & production-ready delivery  
* **User Story:** As a **Stakeholder**, I want a **fully tested and bug-free system**, so that **the mailing pipeline is reliable and ready for live use.**  
* **Description:** Run the full pipeline against multiple test batches, fix bugs, and perform final hand-off.  
* **Acceptance Criteria:**  
  * Successful end-to-end run with 0 manual intervention.  
  * Data accuracy matches the 95%+ threshold.  
  * Final code is deployed to the production environment.  
* **Estimate:** 5 Hours  
* **Priority:** High (Final Milestone)