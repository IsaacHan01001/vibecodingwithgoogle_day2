import os
import sys
import mimetypes
import google.auth
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload

def upload_file(file_path, folder_id=None):
    """
    Uploads a file to Google Drive using Application Default Credentials (ADC).
    
    Args:
        file_path (str): Path to the local file to upload.
        folder_id (str, optional): Google Drive folder ID to upload the file into.
        
    Returns:
        str: The uploaded file's ID, or None if the upload failed.
    """
    if not os.path.exists(file_path):
        print(f"Error: Local file '{file_path}' does not exist.")
        return None

    filename = os.path.basename(file_path)

    # 1. Load credentials. By default, google.auth.default() will check:
    #    a) The GOOGLE_APPLICATION_CREDENTIALS environment variable.
    #    b) Credentials set up via Google Cloud SDK: `gcloud auth application-default login`
    #    c) App Engine / Compute Engine / Cloud Run environment.
    try:
        # Request drive.file scope (allows creating and editing files created by this app)
        creds, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/drive.file'])
    except google.auth.exceptions.DefaultCredentialsError:
        print("Error: Could not automatically find credentials.")
        print("Please configure credentials by running:")
        print("  gcloud auth application-default login --scopes=https://www.googleapis.com/auth/drive.file")
        print("Or by setting the GOOGLE_APPLICATION_CREDENTIALS environment variable to your service account key path.")
        return None

    try:
        # 2. Build the Drive service (v3)
        service = build('drive', 'v3', credentials=creds)

        # 3. Define the file metadata
        file_metadata = {'name': filename}
        if folder_id:
            file_metadata['parents'] = [folder_id]

        # 4. Determine MIME type
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type:
            mime_type = 'application/octet-stream'

        # 5. Prepare the media body
        media = MediaFileUpload(file_path, mimetype=mime_type, resumable=True)

        print(f"Uploading '{filename}' ({mime_type}) to Google Drive...")
        
        # 6. Execute upload
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, webViewLink'
        ).execute()

        print("Upload successful!")
        print(f"File Name: {file.get('name')}")
        print(f"File ID: {file.get('id')}")
        print(f"Web View Link: {file.get('webViewLink')}")
        
        return file.get('id')

    except HttpError as error:
        print(f"An API error occurred: {error}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python upload_to_drive.py <local_file_path> [parent_folder_id]")
        sys.exit(1)
        
    local_path = sys.argv[1]
    parent_id = sys.argv[2] if len(sys.argv) > 2 else None
    
    upload_file(local_path, parent_id)
