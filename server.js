const express = require('express');
const youtubedl = require('youtube-dl-exec'); // YouTube downloader
const { exec } = require('child_process');  // For merging streams (ffmpeg)
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to merge video and audio streams using ffmpeg
const mergeStreams = (videoUrl, audioUrl, outputFile) => {
    return new Promise((resolve, reject) => {
        const command = `ffmpeg -i ${videoUrl} -i ${audioUrl} -c:v copy -c:a aac -strict experimental ${outputFile}`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error merging streams: ${stderr}`);
            }
            resolve(stdout);
        });
    });
};

// Fetch video info
app.get('/video-info', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: 'YouTube URL is required.' });
    }

    try {
        // Fetch video info using youtube-dl-exec
        const result = await youtubedl(videoUrl, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true,
        });

        // Log all formats to check what's available
        console.log(result.formats);  // This will help in debugging available formats

        // Filter out video formats that do not have both video and audio streams
        const formats = result.formats.filter(format => format.vcodec !== 'none' && format.acodec !== 'none');

        // Check if high-quality video and audio are separate (e.g., for 1080p)
        let mergedVideoUrl = '';
        let mergedAudioUrl = '';

        formats.forEach((format) => {
            if (format.height === 1080 && format.vcodec !== 'none' && format.acodec === 'none') {
                mergedVideoUrl = format.url;
            }
            if (format.height === 1080 && format.acodec !== 'none' && format.vcodec === 'none') {
                mergedAudioUrl = format.url;
            }
        });

        // If there are separate streams, we need to merge them
        if (mergedVideoUrl && mergedAudioUrl) {
            const outputFile = `downloads/${result.title}-1080p.mp4`;
            await mergeStreams(mergedVideoUrl, mergedAudioUrl, outputFile);
            // Send merged file to the user
            res.json({
                title: result.title,
                thumbnail: result.thumbnail,
                formats: [
                    {
                        quality: '1080p',
                        url: outputFile, // Merged video URL
                        container: 'mp4',
                    },
                    ...formats.filter(format => format.height !== 1080), // Other formats
                ],
            });
        } else {
            // If no separate streams, send the available formats as they are
            res.json({
                title: result.title,
                thumbnail: result.thumbnail,
                formats: formats.map(format => ({
                    quality: format.format_note || `${format.height}p`, // Quality
                    url: format.url,  // Direct download link
                    container: format.ext,  // Format type (mp4, webm, etc.)
                })),
            });
        }
    } catch (err) {
        console.error('Error fetching video info:', err.message);
        res.status(500).json({ error: 'Failed to fetch video info. Please try again later.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
