<script>
    const BACKEND_CONFIG = {
        heroku: 'https://your-heroku-app-name.herokuapp.com', // Replace with your Heroku URL
        aws: 'http://your-ec2-public-ip:3000', // Replace with your EC2 IP
        local: 'http://localhost:3000' // Local server URL
    };

    const backendSelect = document.getElementById('backend-select');
    let activeBackend = backendSelect.value;

    backendSelect.addEventListener('change', () => {
        activeBackend = backendSelect.value;
    });

    const responseOutput = document.getElementById('response-output');

    function addMessage(content, isUser = false) {
        const div = document.createElement('div');
        div.className = `message ${isUser ? 'user' : 'assistant'}`;
        div.innerHTML = content;
        responseOutput.appendChild(div);
        responseOutput.scrollTop = responseOutput.scrollHeight;
    }

    async function thinkMedically(query, fileData, voiceText) {
        addMessage('Thinking...', false);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate thinking delay
        return `Analyzing: "${query}"${fileData ? ' with attached data' : ''}${voiceText ? ' and voice input' : ''}.<br>Reasoning: Checking medical context...`;
    }

    // Submit query
    document.getElementById('submit-btn').addEventListener('click', async () => {
        const api = document.getElementById('api-select').value;
        const query = document.getElementById('query-input').value;
        const fileInput = document.getElementById('file-upload');
        const file = fileInput.files[0];
        const tokenUsageDiv = document.getElementById('token-usage');

        if (!query && !file) return;

        addMessage(query, true);
        const thinking = await thinkMedically(query, file, null);

        const formData = new FormData();
        formData.append('api', api);
        formData.append('query', query);
        if (file) formData.append('file', file);

        try {
            addMessage(thinking, false);
            const response = await fetch(`${BACKEND_CONFIG[activeBackend]}/api/query`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            addMessage(data.response, false);
            tokenUsageDiv.textContent = `Tokens: ${data.tokens} | Cost: $${data.cost.toFixed(2)}`;
            document.getElementById('query-input').value = '';
            fileInput.value = '';
        } catch (error) {
            addMessage(`Error: ${error.message}`, false);
        }
    });

    // Voice recording
    let mediaRecorder;
    document.getElementById('voice-btn').addEventListener('click', () => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                mediaRecorder = new MediaRecorder(stream);
                const chunks = [];
                mediaRecorder.ondataavailable = e => chunks.push(e.data);
                mediaRecorder.onstop = async () => {
                    const blob = new Blob(chunks, { type: 'audio/webm' });
                    const formData = new FormData();
                    formData.append('api', document.getElementById('api-select').value);
                    formData.append('voice', blob, 'recording.webm');
                    try {
                        const response = await fetch(`${BACKEND_CONFIG[activeBackend]}/api/voice`, {
                            method: 'POST',
                            body: formData
                        });
                        const data = await response.json();
                        addMessage('Voice input transcribed: ' + data.text, true);
                        const thinking = await thinkMedically(data.text, null, true);
                        addMessage(thinking + '<br>' + data.response, false);
                    } catch (error) {
                        addMessage(`Error: ${error.message}`, false);
                    }
                };
                mediaRecorder.start();
                document.getElementById('voice-btn').classList.add('recording');
            });
        } else if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            document.getElementById('voice-btn').classList.remove('recording');
        }
    });

    // Deep Search
    document.getElementById('deep-search-btn').addEventListener('click', async () => {
        const query = document.getElementById('query-input').value;
        if (!query) return;

        addMessage('Deep searching medical sources...', false);
        try {
            const response = await fetch(`${BACKEND_CONFIG[activeBackend]}/api/deep-search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            const data = await response.json();
            addMessage(`Deep Search Results:<br>${data.results}`, false);
        } catch (error) {
            addMessage(`Error: ${error.message}`, false);
        }
    });

    // Subscribe
    document.getElementById('subscribe-btn').addEventListener('click', () => {
        window.location.href = `${BACKEND_CONFIG[activeBackend]}/stripe/checkout`;
    });
</script>