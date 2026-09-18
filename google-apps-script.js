/**
 * ============================================================================
 * ROYAL HOME PAINTING — GOOGLE SHEETS AUTOMATIC SYNC SCRIPT
 * Tagline: "Simple, Seamless, Satisfaction" | Bangalore, India
 * Account: royalhomepainting11@gmail.com
 * ============================================================================
 * 
 * 📌 HOW TO SET THIS UP IN 1 MINUTE (Completely Free & Automatic):
 * 
 * 1. Log into Google with: royalhomepainting11@gmail.com
 * 2. Go to: https://sheets.new (creates a new Google Sheet).
 * 3. Title the Sheet: "Royal Home Painting — Customer Leads"
 * 4. In the top menu, click: Extensions > Apps Script.
 * 5. Delete any code in the editor, and PASTE the code below into it.
 * 6. Click the blue "Deploy" button (top right) > "New deployment".
 * 7. Click the gear icon (Select type) > choose "Web app".
 * 8. Set the following options:
 *    - Description: "Royal Home Painting Lead Webhook"
 *    - Execute as: "Me (royalhomepainting11@gmail.com)"
 *    - Who has access: "Anyone"
 * 9. Click "Deploy", approve permissions if prompted.
 * 10. Copy the "Web app URL" (starts with https://script.google.com/macros/s/...)
 * 11. Open your project's .env file and paste it:
 *     GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/your-url-here/exec
 * 
 * That's it! Every lead from your website will instantly appear in your Google Sheet!
 * ============================================================================
 */

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    // Parse incoming lead JSON
    var data = JSON.parse(e.postData.contents);

    // If the sheet is empty, create formatted brand headers
    if (sheet.getLastRow() === 0) {
      var headers = [
        "Lead ID", 
        "Timestamp", 
        "Customer Name", 
        "Phone Number", 
        "Bangalore Area", 
        "Service Required", 
        "Notes / Problem Details", 
        "Status"
      ];
      sheet.appendRow(headers);

      // Style headers in Royal Home Painting Brand Colors (#F0620D Orange & White bold text)
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#F0620D");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
      headerRange.setFontSize(11);
      headerRange.setHorizontalAlignment("center");
      headerRange.setVerticalAlignment("middle");
      sheet.setRowHeight(1, 35);
      
      // Freeze header row
      sheet.setFrozenRows(1);
    }

    // Append the new lead row
    sheet.appendRow([
      data.id ? "#RHP-" + String(data.id).padStart(4, "0") : "NEW",
      data.timestamp || new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      data.name,
      "'" + data.phone, // Prepends single quote so phone number stays formatted with +91 or leading zeros
      data.area || "Bangalore",
      data.service || "House Painting",
      data.notes || "None",
      "New Lead (Pending Call within 24h)"
    ]);

    // Format new row styling
    var lastRow = sheet.getLastRow();
    var dataRange = sheet.getRange(lastRow, 1, 1, 8);
    dataRange.setVerticalAlignment("middle");
    sheet.setRowHeight(lastRow, 28);
    
    // Auto-fit column widths
    for (var col = 1; col <= 8; col++) {
      sheet.autoResizeColumn(col);
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Lead appended successfully",
      leadId: data.id 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function you can run directly inside Apps Script editor to test
function testLeadRow() {
  var mockEvent = {
    postData: {
      contents: JSON.stringify({
        id: 999,
        timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        name: "Test Customer",
        phone: "+91 97403 18779",
        area: "Indiranagar, Bangalore",
        service: "House Painting & Waterproofing",
        notes: "Test inquiry from Royal Home Painting script",
        source: "Script Test"
      })
    }
  };
  var result = doPost(mockEvent);
  Logger.log(result.getContent());
}
