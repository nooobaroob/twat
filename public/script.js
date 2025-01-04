const fetchVideoInfo = async () => {
    const videoUrl = document.getElementById('video-url').value;

    if (!videoUrl) {
        alert('Please enter a valid YouTube URL.');
        return;
    }

    // Show loading animation
    document.getElementById('loading').style.display = 'block';
    document.getElementById('video-details').style.display = 'none';

    try {
        const response = await fetch(`/video-info?url=${encodeURIComponent(videoUrl)}`);
        const data = await response.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        // Display video details
        document.getElementById('thumbnail').src = data.thumbnail;
        document.getElementById('title').textContent = data.title;

        const downloadButtons = document.getElementById('download-buttons');
        downloadButtons.innerHTML = ''; // Clear previous buttons

        // Create a button for each format
        data.formats.forEach(format => {
            const button = document.createElement('button');
            button.textContent = `${format.quality} (${format.container})`;
            button.onclick = () => window.open(format.url, '_blank');
            downloadButtons.appendChild(button);
        });

        // Show video details
        document.getElementById('video-details').style.display = 'block';
    } catch (err) {
        console.error(err);
        alert('Failed to fetch video details.');
    } finally {
        // Hide loading animation
        document.getElementById('loading').style.display = 'none';
    }
};
