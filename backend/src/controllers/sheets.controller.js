/**
 * Google Sheets Utility Controller
 * Provides helper endpoints for Google Sheets integration
 */

/**
 * GET /api/sheets/tabs
 * Detects all available tabs in a Google Sheets document
 * 
 * Query params:
 *   - url: Google Sheets URL (required)
 * 
 * Returns:
 *   - tabs: Array of { name: string, gid: string }
 */
exports.getSheetTabs = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({
                success: false,
                message: 'URL parameter is required'
            });
        }

        // Extract spreadsheet ID from URL
        const match = url.match(/\/d\/([\w-]+)/);
        if (!match || !match[1]) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Google Sheets URL'
            });
        }

        const spreadsheetId = match[1];
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

        // Fetch the HTML page
        const response = await fetch(sheetUrl);

        if (!response.ok) {
            return res.status(400).json({
                success: false,
                message: 'Failed to fetch sheet. Ensure it is publicly accessible.'
            });
        }

        const html = await response.text();

        // Extract tab data from embedded JSON
        // Google Sheets embeds sheet metadata in a <script> tag with var _docs_flag_initialData
        const tabs = extractTabsFromHtml(html);

        if (!tabs || tabs.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No tabs found. The sheet might be private or the structure has changed.'
            });
        }

        res.json({
            success: true,
            tabs
        });

    } catch (error) {
        console.error('Error fetching sheet tabs:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching tabs',
            error: error.message
        });
    }
};

/**
 * Helper function to extract tab names and GIDs from Google Sheets HTML
 * @param {string} html - The HTML content of the Google Sheets page
 * @returns {Array} Array of { name: string, gid: string }
 */
function extractTabsFromHtml(html) {
    try {
        // Method 1: Try to find the sheets data in the embedded JSON
        // Google Sheets stores sheet metadata in various places, we'll try multiple patterns

        // Pattern 1: Look for sheet names in the format "sheets":[{"properties":{"sheetId":0,"title":"Sheet1"
        const sheetsMatch = html.match(/"sheets":\[(.*?)\]/s);
        if (sheetsMatch) {
            const sheetsJson = sheetsMatch[0];
            const tabs = [];

            // Extract each sheet's title and sheetId
            const sheetPattern = /"sheetId":(\d+).*?"title":"([^"]+)"/g;
            let match;

            while ((match = sheetPattern.exec(sheetsJson)) !== null) {
                tabs.push({
                    gid: match[1],
                    name: match[2]
                });
            }

            if (tabs.length > 0) {
                return tabs;
            }
        }

        // Pattern 2: Alternative extraction method
        // Look for sheet data in a different format
        const altPattern = /"sheetId":(\d+),"title":"([^"]+)"/g;
        const tabs = [];
        let match;

        while ((match = altPattern.exec(html)) !== null) {
            tabs.push({
                gid: match[1],
                name: match[2]
            });
        }

        // Remove duplicates (same gid)
        const uniqueTabs = tabs.filter((tab, index, self) =>
            index === self.findIndex((t) => t.gid === tab.gid)
        );

        return uniqueTabs;

    } catch (error) {
        console.error('Error parsing tabs from HTML:', error);
        return [];
    }
}
