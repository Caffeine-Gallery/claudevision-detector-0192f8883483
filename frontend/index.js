import { backend } from 'declarations/backend';

class ObjectDetector {
    constructor() {
        this.apiKey = '';
        this.setupEventListeners();
    }

    setupEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const apiKeyInput = document.querySelector('.api-key-input');

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        });

        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        apiKeyInput.addEventListener('change', (e) => {
            this.apiKey = e.target.value;
            this.saveApiKey();
        });

        this.loadApiKey();
    }

    async saveApiKey() {
        try {
            await backend.saveApiKey(this.apiKey);
        } catch (error) {
            console.error('Failed to save API key:', error);
        }
    }

    async loadApiKey() {
        try {
            const apiKey = await backend.getApiKey();
            if (apiKey) {
                this.apiKey = apiKey;
                document.querySelector('.api-key-input').value = apiKey;
            }
        } catch (error) {
            console.error('Failed to load API key:', error);
        }
    }

    async handleFiles(files) {
        if (!this.apiKey) {
            this.showError('Please enter your Anthropic API key first');
            return;
        }

        const loading = document.querySelector('.loading');
        loading.classList.add('active');
        this.clearError();

        try {
            for (const file of files) {
                if (!file.type.startsWith('image/')) continue;
                
                const base64Image = await this.fileToBase64(file);
                const detections = await this.detectObjects(base64Image);
                await this.displayResults(file, base64Image, detections);
            }
        } catch (error) {
            this.showError(error.message);
        } finally {
            loading.classList.remove('active');
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    }

    async detectObjects(base64Image) {
        try {
            const result = await backend.detectObjects(this.apiKey, base64Image);
            return JSON.parse(result);
        } catch (error) {
            throw new Error(`Detection failed: ${error.message}`);
        }
    }

    getRandomColor() {
        const hue = Math.random();
        const saturation = 0.85 + Math.random() * 0.15;
        const value = 0.85 + Math.random() * 0.15;
        
        let r, g, b;
        
        const i = Math.floor(hue * 6);
        const f = hue * 6 - i;
        const p = value * (1 - saturation);
        const q = value * (1 - f * saturation);
        const t = value * (1 - (1 - f) * saturation);

        switch (i % 6) {
            case 0: r = value, g = t, b = p; break;
            case 1: r = q, g = value, b = p; break;
            case 2: r = p, g = value, b = t; break;
            case 3: r = p, g = q, b = value; break;
            case 4: r = t, g = p, b = value; break;
            case 5: r = value, g = p, b = q; break;
        }

        return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    }

    async displayResults(file, base64Image, results) {
        const container = document.getElementById('previewContainer');
        const wrapper = document.createElement('div');
        wrapper.className = 'image-preview';

        const img = document.createElement('img');
        img.src = `data:image/jpeg;base64,${base64Image}`;
        wrapper.appendChild(img);

        await new Promise((resolve) => {
            img.onload = () => {
                const { width, height } = img;
                
                results.detections.forEach(detection => {
                    const [x1, y1, x2, y2] = detection.bbox;
                    const color = this.getRandomColor();
                    
                    const box = document.createElement('div');
                    box.className = 'bounding-box';
                    box.style.left = `${x1 * width}px`;
                    box.style.top = `${y1 * height}px`;
                    box.style.width = `${(x2 - x1) * width}px`;
                    box.style.height = `${(y2 - y1) * height}px`;
                    box.style.borderColor = color;

                    const label = document.createElement('div');
                    label.className = 'box-label';
                    label.style.backgroundColor = color;
                    label.textContent = `${detection.element} (${(detection.confidence * 100).toFixed(1)}%)`;
                    box.appendChild(label);

                    wrapper.appendChild(box);
                });
                resolve();
            };
        });

        container.appendChild(wrapper);
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    clearError() {
        const errorElement = document.getElementById('errorMessage');
        errorElement.style.display = 'none';
    }
}

// Initialize the application
const detector = new ObjectDetector();
