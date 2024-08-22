const { sheets } = require("./googleService");
const { drive } = require("./googleService");

// Set the parent folder ID for the "temp" folder
const parentFolderId = "1k_Uiqc0QugNES6x121aFcfbhsmFA6gNx"; // Replace with the actual folderId of "test folder"

const CustomerNumbers = {}; //structuere => { '1111111111': true, '2222222222': true, '3333333333': true } coming from google sheet

async function getSheetData(spreadsheetId, range) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return res.data.values;
}

async function createFolder(folderName, parentFolderId) {
  const fileMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: [parentFolderId],
  };

  const res = await drive.files.create({
    resource: fileMetadata,
    fields: "id",
  });
  console.log("folder id", res.data.id);
  return res.data.id;
}
async function getFolderList(parentFolderId) {
  if (parentFolderId) {
    const response = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
    });

    if (response.data.files) {
      return response.data.files;
    } else {
      return [];
    }
  }
}
async function getFileList(parentFolderId) {
  if (parentFolderId) {
    const response = await drive.files.list({
      q: `'${parentFolderId}' in parents and trashed=false`,
      fields: "files(id, name, mimeType)",
    });

    if (response.data.files) {
      return response.data.files;
    } else {
      return [];
    }
  }
}
function getCurrentDate() {
  const now = new Date();

  // Get the current year
  const year = now.getFullYear();

  // Get the current month (0-indexed, so add 1)
  const month = String(now.getMonth() + 1).padStart(2, "0");

  // Get the current day
  const day = String(now.getDate()).padStart(2, "0");

  return {
    year,
    month,
    day,
  };
}
async function copyFileToFolder(fileId, fileName, folderId) {
  try {
    // Copy the file to the target folder
    const copiedFile = await drive.files.copy({
      fileId: fileId,
      requestBody: {
        name: fileName, // Name of the copied file
        parents: [folderId], // The ID of the "important" folder
      },
    });

    console.log(`File copied successfully: ${copiedFile.data.id}`);
  } catch (error) {
    console.error("Error copying file:", error);
  }
}

async function organizeData(parentFolderId) {
  const { year, month, day } = getCurrentDate();

  // Get list of folders within the parent folder
  const arr = await getFolderList(parentFolderId);

  if (arr.length > 0) {
    // Find the folder for the current year
    const yearObj = arr.find((obj) => obj.name === year.toString());

    if (yearObj) {
      // Get list of folders within the year folder
      const monthArr = await getFolderList(yearObj.id);

      // Find the folder for the current month
      const monthObj = monthArr.find((obj) => obj.name === month.toString());

      if (monthObj) {
        // Get list of folders within the month folder
        const dateArr = await getFolderList(monthObj.id);

        // Find the folder for the current day
        const dateObj = dateArr.find((obj) => obj.name === day.toString());

        if (dateObj) {
          // Get the list of files in the day's folder
          const fileList = await getFileList(dateObj.id);

          // Check if "important" folder exists, and create if it doesn't
          let importantFolder = fileList.find(
            (obj) =>
              obj.name === "important" &&
              obj.mimeType === "application/vnd.google-apps.folder"
          );

          if (!importantFolder) {
            const importantFolderId = await createFolder(
              "important",
              dateObj.id
            );
            importantFolder = { id: importantFolderId };
          }

          // Filter out the text/plain files that represent call records
          const callList = fileList.filter(
            (obj) => obj.mimeType === "text/plain"
          );

          // Process each file and check if the phone number exists in CustomerNumbers
          for (const file of callList) {
            const match = file.name.match(/from_(\d+)_/);
            if (match) {
              const phoneNumber = match[1];

              if (CustomerNumbers[phoneNumber]) {
                // Copy the file to the "important" folder
                await copyFileToFolder(file.id, file.name, importantFolder.id);
                console.log(`Copied ${file.name} to the "important" folder`);
              }
            }
          }
        }
      }
    }
  }
}

(async () => {
  const spreadsheetId = "1unqPM8i0mnZsxGZjARb2-zz6SZ5exrJ_rrC2nbAksog"; // Replace with your Google Sheet ID
  const range = "Sheet1!A:B"; // Replace with the range where the data is stored
  const rows = await getSheetData(spreadsheetId, range);
  console.log(rows); //structure=> [ [ '1111111111' ], [ '2222222222' ], [ '3333333333' ] ]

  rows.forEach(([phoneNumber]) => {
    CustomerNumbers[phoneNumber] = true;
  });

  console.log(CustomerNumbers);

  await organizeData(parentFolderId);
})();
