# Artifact System User Guide

**Version**: 1.0  
**Last Updated**: January 16, 2026  
**Audience**: End Users

## Table of Contents

1. [Getting Started](#getting-started)
2. [Connecting Cloud Storage](#connecting-cloud-storage)
3. [Reviewing Pending Artifacts](#reviewing-pending-artifacts)
4. [Managing Artifacts](#managing-artifacts)
5. [Linking to Projects](#linking-to-projects)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## Getting Started

### What is the Artifact System?

The Artifact System automatically discovers your creative and academic work from cloud storage (Google Drive, Dropbox, iCloud) and helps you curate it for inclusion in your digital CV.

**Key Features**:
- 🔍 **Automatic Discovery**: Scans your cloud storage for papers, images, presentations, code
- 🤖 **AI Classification**: Uses AI to categorize your work automatically
- ✏️ **Easy Curation**: Review, edit, approve/reject artifacts in a clean UI
- 🔗 **CV Integration**: Link approved artifacts to Projects and Publications
- 🔒 **Privacy First**: Your files stay in your cloud storage; we only sync metadata

### What You'll Need

- A profile in the In-Midst system
- A cloud storage account (Google Drive, Dropbox, or iCloud)
- Files you want to include in your CV (papers, images, presentations, etc.)

---

## Connecting Cloud Storage

### Step 1: Navigate to Integrations Settings

1. Log in to your account
2. Click your profile picture in the top right
3. Select **Settings**
4. Click **Integrations** in the sidebar

### Step 2: Choose Your Cloud Provider

You'll see three options:

#### Option A: Google Drive

**Best for**:
- Academic papers stored in Google Drive
- Collaborative documents
- Shared folders with colleagues

**To connect**:
1. Click **"Connect Google Drive"**
2. You'll be redirected to Google's authorization page
3. Sign in to your Google account (if not already signed in)
4. Review permissions:
   - "View and download all your Google Drive files"
   - **Note**: We only read metadata; your files stay in Drive
5. Click **"Allow"**
6. You'll be redirected back to In-Midst
7. ✅ Success! Your Google Drive is now connected

**Permissions Explained**:
- We need read access to list files and extract metadata
- We **cannot** edit, delete, or share your files
- You can revoke access anytime in Google Account settings

#### Option B: Dropbox

**Best for**:
- Portfolio files (images, videos, presentations)
- Project documentation
- Code repositories

**To connect**:
1. Click **"Connect Dropbox"**
2. You'll be redirected to Dropbox's authorization page
3. Sign in to your Dropbox account
4. Review permissions:
   - "View files in your Dropbox"
5. Click **"Allow"**
6. You'll be redirected back to In-Midst
7. ✅ Success! Your Dropbox is now connected

#### Option C: iCloud Drive (macOS only)

**Best for**:
- Files stored locally on your Mac
- iCloud Photos
- Personal documents

**To connect**:
1. Click **"Connect iCloud Drive"**
2. Enter the path to your iCloud folder (usually auto-detected)
3. Grant permission when prompted by macOS
4. ✅ Success! Your iCloud Drive is now connected

**Note**: iCloud integration requires the In-Midst app to be running on your Mac.

### Step 3: Configure Folder Monitoring (Optional)

After connecting, you can customize which folders to monitor:

1. Find your connected integration in the list
2. Click **"Configure"**
3. Specify:
   - **Included Folders**: Which folders to scan (e.g., `/Academic`, `/Portfolio`)
   - **Excluded Folders**: Folders to skip (e.g., `/Private`, `/Temp`)
   - **Max File Size**: Maximum file size to import (default: 100MB)
4. Click **"Save"**

**Example Configuration**:
```
Included Folders:
- /Academic/Papers
- /Academic/Presentations
- /Creative Writing
- /Code Projects

Excluded Folders:
- /Private
- /Work/Confidential
- /Temp

Max File Size: 100 MB
```

### Step 4: Trigger Initial Sync

1. Click **"Sync Now"** on your connected integration
2. Wait for sync to complete (5-30 minutes depending on file count)
3. You'll see a notification when sync is done
4. Navigate to **"Pending Artifacts"** to review discoveries

---

## Reviewing Pending Artifacts

### Accessing the Pending Dashboard

1. From the main menu, click **"Artifacts"**
2. Select **"Pending"** (or the badge showing count)
3. You'll see a grid of discovered artifacts awaiting your review

### Understanding Artifact Cards

Each card shows:
- **Icon**: File type indicator (📄 paper, 🖼️ image, 🎥 video, etc.)
- **Title**: Filename or extracted title
- **Type**: AI-suggested classification
- **Confidence**: How certain the AI is about the classification
- **Source**: Which cloud storage it came from
- **Date**: When the file was originally created

**Confidence Levels**:
- 🟢 **90-100%**: Very confident (likely accurate)
- 🟡 **70-89%**: Moderately confident (review classification)
- 🔴 **<70%**: Low confidence (definitely review)

### Filtering Artifacts

Use the filter bar to narrow down artifacts:

- **By Type**: Academic Papers, Creative Writing, Visual Art, etc.
- **By Source**: Google Drive, Dropbox, iCloud
- **By Confidence**: High (>80%), Medium (50-80%), Low (<50%)
- **By Date**: Last week, last month, last year, custom range

**Example**: Show me all academic papers from Google Drive with low confidence:
```
Type: Academic Papers
Source: Google Drive
Confidence: Low (<70%)
```

### Reviewing an Artifact

Click on an artifact card to open the detail view:

**Left Panel** (Preview):
- **PDF Files**: Embedded PDF viewer
- **Images**: Full-size image display
- **Videos**: Embedded video player
- **Other Files**: File icon and metadata

**Right Panel** (Details & Actions):
- **AI Suggestions**: Classification confidence and reasoning
- **Metadata Editor**: Edit title, description, type, tags

### Editing Metadata

Before approving, you can edit:

1. **Title**: Click to edit the artifact's display name
2. **Description**: Add context or summary (supports Markdown)
3. **Artifact Type**: Change classification if AI got it wrong
4. **Tags**: Add keywords for filtering (e.g., "published", "2024", "collaboration")

**Example**:
```
Title: Temporal Dynamics of Narrative Systems
Description: Ph.D. dissertation exploring how narratives evolve over time in complex systems. 
            Published May 2015 at Stanford University.
Type: Academic Paper
Tags: research, phd, completed, stanford, 2015
```

### Taking Action

You have three options:

#### ✅ **Approve**
- Includes artifact in your CV
- Makes it available for linking to Projects/Publications
- Artifact appears in relevant CV sections

**When to approve**:
- File represents your work
- Metadata is accurate
- You want it in your CV

#### ❌ **Reject**
- Excludes artifact from your CV
- Artifact won't appear again (unless re-synced)
- Useful for personal files, drafts, or irrelevant documents

**When to reject**:
- Not your work (shared folder content)
- Personal/private files
- Duplicate or outdated versions
- Low-quality drafts

#### 🗄️ **Archive**
- Soft-deletes the artifact
- Can be restored later if needed
- Useful for "maybe later" decisions

### Bulk Actions

To process multiple artifacts at once:

1. Enable selection mode (checkbox icon in top bar)
2. Click checkboxes on artifacts you want to process
3. Action bar appears at bottom of screen
4. Click **"Approve All"**, **"Reject All"**, or **"Archive All"**

**Pro Tip**: Use filters first to narrow down, then bulk approve. Example:
```
1. Filter: Type = Academic Papers, Confidence > 85%
2. Select all (20 items)
3. Click "Approve All"
```

---

## Managing Artifacts

### Viewing Approved Artifacts

1. Navigate to **"Artifacts"** → **"Approved"**
2. See all artifacts you've approved
3. Click any artifact to view details or make changes

### Editing an Existing Artifact

1. Open the artifact detail view
2. Click **"Edit"** button
3. Make changes to metadata
4. Click **"Save"**

**Note**: You can't change the source file, only metadata.

### Changing Artifact Status

- **Unapprove**: Click **"Reject"** on an approved artifact
- **Reapprove**: Click **"Approve"** on a rejected artifact
- **Archive**: Click **"Archive"** to soft-delete

### Searching Artifacts

Use the search bar at the top:

- Search by title, description, or tags
- Results update as you type
- Combine with filters for precise results

**Example Searches**:
- `"machine learning"` - Finds exact phrase
- `published 2024` - Finds artifacts with both terms
- `tag:research` - Finds artifacts tagged with "research"

---

## Linking to Projects

### Why Link Artifacts?

Linking artifacts to Projects or Publications:
- Shows your work in context
- Creates visual connections in your CV
- Demonstrates impact and output

### How to Link

**Method 1: From Artifact Detail**
1. Open an approved artifact
2. Scroll to **"Linked To"** section
3. Click **"Add Link"**
4. Select **Project** or **Publication**
5. Choose from your existing entities
6. Click **"Link"**

**Method 2: From Project View**
1. Navigate to **"Projects"** → Select a project
2. Scroll to **"Artifacts"** section
3. Click **"Add Artifact"**
4. Select from approved artifacts
5. Click **"Link"**

### Link Types

- **Deliverable**: Artifact is an output of the project
- **Documentation**: Artifact documents the project
- **Reference**: Artifact was used as reference/input

**Example**:
```
Project: "AI-Powered CV System"
Linked Artifacts:
- research_paper.pdf (Deliverable)
- architecture_diagram.png (Documentation)
- dataset.csv (Reference)
```

### Unlinking

To remove a link:
1. Open artifact or project
2. Find the link in **"Linked To"** section
3. Click **"Remove Link"**
4. Confirm removal

---

## Troubleshooting

### Issue: "Connection Failed" Error

**Symptoms**: Can't connect Google Drive or Dropbox

**Possible Causes**:
1. **OAuth popup blocked**: Check browser popup settings
2. **Network issues**: Try again with stable internet
3. **Account permissions**: Ensure you have admin access to your cloud storage

**Solutions**:
1. Allow popups for `midst.example.com`
2. Try in incognito/private browsing mode
3. Refresh the page and try again
4. Contact support if persists

### Issue: Files Not Showing Up

**Symptoms**: Connected cloud storage but no artifacts discovered

**Possible Causes**:
1. **Sync not complete**: Initial sync takes 5-30 minutes
2. **Empty folders**: No files in monitored folders
3. **File types excluded**: File types not supported
4. **Size limit exceeded**: Files larger than max size

**Solutions**:
1. Wait for sync to complete (check notification bell)
2. Click **"Sync Now"** to manually trigger
3. Check **"Configure"** settings for included folders
4. Review sync logs (Settings → Integrations → View Logs)

### Issue: Wrong Classification

**Symptoms**: AI classified your paper as "creative writing" when it's academic

**Solution**:
1. Open the artifact detail view
2. Click **"Edit"**
3. Change **Artifact Type** to correct classification
4. Click **"Save"**
5. Your correction helps improve AI accuracy

### Issue: "Token Expired" Error

**Symptoms**: Sync fails with authentication error

**Possible Causes**: OAuth token expired (happens after 60-90 days)

**Solution**:
1. Navigate to **Settings** → **Integrations**
2. Find the integration with error
3. Click **"Reconnect"**
4. Complete OAuth flow again
5. Sync will resume automatically

### Issue: Duplicate Artifacts

**Symptoms**: Same file appears multiple times

**Possible Causes**:
1. File exists in multiple monitored folders
2. File was copied/moved and re-synced
3. Sync state corrupted

**Solution**:
1. Keep one, reject/archive duplicates
2. Check folder configuration to avoid overlaps
3. Contact support if duplicates persist after cleanup

### Issue: Slow UI Performance

**Symptoms**: Dashboard loads slowly, laggy interactions

**Possible Causes**:
1. Too many pending artifacts (>1000)
2. Large file previews (high-res images)
3. Browser cache full

**Solutions**:
1. Use filters to reduce visible items
2. Approve/reject in batches to reduce pending count
3. Clear browser cache (Ctrl+Shift+Delete)
4. Upgrade to modern browser (Chrome, Firefox, Edge)

---

## FAQ

### General Questions

**Q: How often does the system sync my cloud storage?**

A: Automatically once per day. You can also trigger manual syncs anytime via **"Sync Now"** button.

---

**Q: Will the system download all my files to its servers?**

A: No. We only download files temporarily to extract metadata (title, dates, EXIF data), then immediately delete them. Your original files stay in your cloud storage.

---

**Q: Can I connect multiple Google Drive accounts?**

A: Yes! Click **"Connect Google Drive"** multiple times, signing in with different accounts each time. Each connection is managed separately.

---

**Q: What file types are supported?**

A: 
- **Documents**: PDF, DOCX, TXT, Markdown
- **Images**: JPG, PNG, GIF, WebP, SVG
- **Videos**: MP4, MOV, WebM
- **Audio**: MP3, WAV, FLAC
- **Code**: Any text-based code file
- **Other**: Most common file types

---

**Q: How do I disconnect a cloud storage provider?**

A: Navigate to **Settings** → **Integrations**, find the provider, click **"Disconnect"**. Your approved artifacts remain; only the sync connection is removed.

---

### Privacy & Security

**Q: Who can see my artifacts?**

A: Only you. Artifacts are private by default. You control which artifacts appear in public/shared CV views via mask settings.

---

**Q: Can In-Midst staff access my files?**

A: No. Our engineers can't access your cloud storage files or OAuth tokens (they're encrypted). We can only see anonymized metadata for debugging.

---

**Q: What happens if I delete a file from my cloud storage?**

A: The artifact record remains in In-Midst (status unchanged), but it's marked as "source unavailable." You can still approve/reject it based on cached metadata.

---

**Q: Can I export my artifact data?**

A: Yes. Navigate to **Settings** → **Data Export** → Select **"Artifacts"** → Click **"Download JSON"**. You'll get all artifact metadata.

---

### Technical Questions

**Q: What AI model is used for classification?**

A: We use a combination of:
- Heuristics (filename, folder path, file extension)
- Metadata analysis (PDF properties, EXIF data)
- Optional LLM analysis (OpenAI GPT-4 or local Llama) for complex cases

---

**Q: Does this work offline?**

A: No. The system requires internet access to sync with cloud storage providers. However, the web UI caches data for limited offline viewing.

---

**Q: Can I use this with a self-hosted cloud storage (NextCloud, Synology)?**

A: Not yet. We plan to support WebDAV and custom integrations in a future release. For now, use the **Local Filesystem** option for self-hosted storage mounted on your machine.

---

**Q: Is there a mobile app?**

A: Not yet. The web UI is mobile-responsive, so you can use it on phone/tablet browsers. Native iOS/Android apps are on the roadmap.

---

### Billing & Limits

**Q: Is there a limit on artifacts or storage?**

A: Free tier: 500 artifacts, 5GB metadata storage. Paid plans: 5,000+ artifacts, unlimited storage. See [Pricing](https://midst.example.com/pricing) for details.

---

**Q: What happens if I exceed my artifact limit?**

A: Sync pauses with a notification. Approve/reject pending artifacts to free up space, or upgrade your plan.

---

### Getting Help

**Q: How do I contact support?**

A: 
- **In-app**: Click **Help** (? icon) → **"Contact Support"**
- **Email**: support@midst.example.com
- **Community Forum**: forum.midst.example.com
- **Documentation**: docs.midst.example.com

---

**Q: Where can I suggest features?**

A: Visit our [Feature Request Board](https://midst.example.com/roadmap) or submit via in-app feedback form.

---

## Tips & Best Practices

### 1. Organize Your Cloud Storage First

Before connecting, organize your cloud storage:
- Move irrelevant files to an excluded folder (`/Private`, `/Temp`)
- Use descriptive folder names (`/Academic Papers`, not `/Stuff`)
- Delete duplicates and outdated versions

### 2. Start Small

Connect one folder at a time:
1. Connect Google Drive, monitor only `/Academic` folder
2. Review discoveries, approve/reject
3. Once confident, add more folders or connect more providers

### 3. Use Tags Liberally

Tags help you find artifacts later:
- **Time-based**: `2024`, `q1-2024`, `spring-semester`
- **Status-based**: `published`, `in-progress`, `draft`
- **Collaboration**: `team-project`, `solo-work`, `client-deliverable`
- **Visibility**: `public`, `portfolio`, `resume-highlight`

### 4. Review Low-Confidence Artifacts First

Prioritize artifacts with confidence <70%:
- Often misclassified (needs correction)
- May be duplicates or irrelevant files
- Quick approve/reject to clean up queue

### 5. Link as You Go

After approving an artifact, immediately link it to a project:
- Fresh in your memory
- Contextualizes the work
- Saves time later

---

**Document Version**: 1.0  
**Last Updated**: January 16, 2026  
**Feedback**: Click **Help** → **"Improve This Doc"** in the app
