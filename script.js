document.addEventListener('DOMContentLoaded', () => {
    // REFERÊNCIAS E LÓGICA DO ACESSO À ANÁLISE
    const loginModal = document.getElementById('login-modal');
    const calculatorContent = document.getElementById('calculator-content');
    const responsibleInput = document.getElementById('responsibleInput');
    const accessBtn = document.getElementById('accessBtn');
    const accessMessage = document.getElementById('accessMessage');
    
    let responsibleName = '';

    loginModal.style.display = 'flex';
    calculatorContent.style.display = 'none';

    accessBtn.addEventListener('click', () => {
        const responsible = responsibleInput.value.trim();
        if (responsible === '') {
            accessMessage.textContent = 'Por favor, insira o nome do responsável.';
            accessMessage.style.color = 'red';
        } else {
            responsibleName = responsible;
            accessMessage.textContent = 'Acesso liberado!';
            accessMessage.style.color = 'green';
            setTimeout(showCalculator, 1500);
        }
    });

    function showCalculator() {
        loginModal.style.display = 'none';
        calculatorContent.style.display = 'flex';
        updateDateTime();
        setInterval(updateDateTime, 1000);
        loadInitialSettings();
        renderAllWells();
        updateExtractedColorPreview();
    }
    
    // FIM DO CÓDIGO DE ACESSO

    // Referências a elementos do DOM
    const imageUpload = document.getElementById('imageUpload');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const imageCanvas = document.getElementById('imageCanvas');
    const ctx = imageCanvas.getContext('2d');
    const canvasContainer = document.querySelector('.canvas-container');
    const addWellBtn = document.getElementById('addWellBtn');
    const clearWellsBtn = document.getElementById('clearWellsBtn');
    const extractedColorPreview = document.getElementById('extractedColorPreview');
    const extractedRDisplay = document.getElementById('extractedR');
    const extractedGDisplay = document.getElementById('extractedG');
    // Correção: a atribuição dupla aqui estava incorreta
    const extractedBDisplay = document.getElementById('extractedB');
    const wellsResultsContainer = document.getElementById('wellsResultsContainer');
    const noWellsMessage = document.getElementById('noWellsMessage');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const averageFcResultSpan = document.getElementById('averageFcResult');
    const averageReductionResultSpan = document.getElementById('averageReductionResult');
    const averageReductionLabel = document.getElementById('averageReductionLabel');
    const fcFormulaInput = document.getElementById('fcFormulaInput');
    const currentFcFormulaDisplay = document.querySelector('.current-fc-formula-display');
    const reductionVariableNameInput = document.getElementById('reductionVariableNameInput');
    const currentReductionVariableNameDisplay = document.querySelector('.current-reduction-variable-name-display');
    const currentDateTimeDisplay = document.getElementById('currentDateTime');
    const sampleSizeInput = document.getElementById('sampleSizeInput'); 
    const methodSelect = document.getElementById('methodSelect');
    const wellNameInput = document.getElementById('wellNameInput');
    const addCalibrationBtn = document.getElementById('addCalibrationBtn');
    const newMethodNameInput = document.getElementById('newMethodNameInput');
    const newReductionFormulaInput = document.getElementById('newReductionFormulaInput');
    const calibrationTableContainer = document.getElementById('calibrationTableContainer');
    const noCalibrationDataMessage = document.getElementById('noCalibrationDataMessage');

    let currentFcFormula;
    let currentReductionVariableName;
    let currentImage = null;
    let calibrationData = JSON.parse(localStorage.getItem('calibrationData')) || [];
    let lastExtractedR = 0;
    let lastExtractedG = 0;
    let lastExtractedB = 0;
    let lastClickPosition = null;
    let zoomLevel = 1.0;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startMouseX = 0;
    let startMouseY = 0;
    let startPanX = 0;
    let startPanY = 0;
    let initialImageDrawX = 0;
    let initialImageDrawY = 0;
    let initialImageDrawWidth = 0;
    let initialImageDrawHeight = 0;
    let selectedWells = JSON.parse(localStorage.getItem('selectedWells')) || [];
    let offscreenCanvas = document.createElement('canvas');
    let offscreenCtx = offscreenCanvas.getContext('2d');

    function updateDateTime() {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-BR');
        const formattedTime = now.toLocaleTimeString('pt-BR');
        currentDateTimeDisplay.textContent = `Data: ${formattedDate} | Hora: ${formattedTime}`;
    }

    function rgbToHex(r, g, b) {
        const toHex = (c) => {
            const hex = Math.round(c).toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    function updateFormulasAndVariables() {
        const fcFormulaStr = fcFormulaInput.value.trim();
        if (!fcFormulaStr) {
            alert('Erro: A Fórmula do Fator de Cor não pode estar vazia.');
            return false;
        }
        currentFcFormula = fcFormulaStr;
        localStorage.setItem('fcCalculationFormula', currentFcFormula);
        currentFcFormulaDisplay.textContent = `Fórmula FC Atual: ${currentFcFormula}`;
        
        const reductionVarNameStr = reductionVariableNameInput.value.trim();
        currentReductionVariableName = reductionVarNameStr || '% Redução';
        localStorage.setItem('reductionVariableName', currentReductionVariableName);
        averageReductionLabel.textContent = `Média ${currentReductionVariableName} dos Poços:`;
        
        return true;
    }

    function loadInitialSettings() {
        const savedFcFormula = localStorage.getItem('fcCalculationFormula');
        if (savedFcFormula) {
            fcFormulaInput.value = savedFcFormula;
        } else {
            fcFormulaInput.value = '(R+G+B)/R';
        }

        const savedReductionVariableName = localStorage.getItem('reductionVariableName');
        if (savedReductionVariableName) {
            reductionVariableNameInput.value = savedReductionVariableName;
        } else {
            reductionVariableNameInput.value = '% Redução';
        }
        
        updateFormulasAndVariables();
        renderCalibrationTable();
        populateMethodSelect();
        renderAllWells();
        calculateAverage();
    }

    function calculateFcValue(R, G, B, formula) {
        try {
            const scope = { R, G, B };
            const formulaWithScope = new Function('scope', `with(scope) { return ${formula}; }`);
            const result = formulaWithScope(scope);
            return isFinite(result) ? result : null;
        } catch (e) {
            console.error('Erro na fórmula FC:', e);
            return null;
        }
    }
    
    function calculateReductionValue(well, formula, allWells) {
        const fcValue = calculateFcValue(well.R, well.G, well.B, currentFcFormula);

        if (fcValue === null) {
            return 'Erro';
        }

        try {
            const scope = { FC: fcValue };
            const wellFcValues = new Map();

            allWells.forEach(w => {
                const wellNameLower = w.wellName.trim().toLowerCase();
                wellFcValues.set(wellNameLower, calculateFcValue(w.R, w.G, w.B, currentFcFormula));
            });

            // Replace well names in the formula with their corresponding FC values
            let safeFormula = formula;
            const variablesInFormula = formula.match(/[a-zA-Z_]+/g) || [];
            
            for (const varName of variablesInFormula) {
                const varNameLower = varName.toLowerCase();
                if (varNameLower === 'fc') continue; // Skip the special 'FC' variable

                const fcValueForWell = wellFcValues.get(varNameLower);

                if (fcValueForWell === undefined || fcValueForWell === null) {
                    return `Poço '${varName}' não encontrado ou com erro de FC.`;
                }

                // Replace the variable name in the formula with its value
                const regex = new RegExp(`\\b${varName}\\b`, 'g');
                safeFormula = safeFormula.replace(regex, fcValueForWell);
            }

            // Finally, replace the FC variable for the current well
            const finalFormula = safeFormula.replace(/\bFC\b/g, fcValue);
            
            const result = eval(finalFormula);

            return isFinite(result) ? result.toFixed(4) : 'Erro';

        } catch (e) {
            console.error('Erro na fórmula de redução:', e);
            return 'Erro';
        }
    }

    function getMethodFormula(methodName) {
        const calibrationEntry = calibrationData.find(entry => entry.methodName === methodName);
        return calibrationEntry ? calibrationEntry.reductionFormula : null;
    }

    function addWell() {
        if (!currentImage || !lastClickPosition) {
            alert('Por favor, clique em uma amostra na imagem para extrair a cor.');
            return;
        }

        const wellName = wellNameInput.value.trim() || `Poço ${selectedWells.length + 1}`;
        const selectedMethod = methodSelect.value;
        const selectedSize = parseInt(sampleSizeInput.value, 10);
        
        if (!selectedMethod) {
            alert('Por favor, selecione um método de calibração válido.');
            return;
        }
        if (isNaN(selectedSize) || selectedSize < 1) {
            alert('Por favor, insira um tamanho de pixel válido (número inteiro).');
            return;
        }

        if (!updateFormulasAndVariables()) {
            return;
        }

        const wellData = {
            wellName: wellName,
            R: lastExtractedR,
            G: lastExtractedG,
            B: lastExtractedB,
            sampleSize: selectedSize,
            methodName: selectedMethod,
            timestamp: new Date().toISOString(),
            clickPosition: lastClickPosition
        };

        selectedWells.push(wellData);
        localStorage.setItem('selectedWells', JSON.stringify(selectedWells));
        renderAllWells();
        calculateAverage();
        wellNameInput.value = '';
    }

    function renderAllWells() {
        wellsResultsContainer.innerHTML = '';
        if (selectedWells.length === 0) {
            noWellsMessage.style.display = 'block';
            return;
        }
        noWellsMessage.style.display = 'none';

        selectedWells.forEach((wellData, index) => {
            const fcValue = calculateFcValue(wellData.R, wellData.G, wellData.B, currentFcFormula);
            let reductionValue;
            
            const methodFormula = getMethodFormula(wellData.methodName);
            if (methodFormula) {
                reductionValue = calculateReductionValue(wellData, methodFormula, selectedWells);
            } else {
                reductionValue = 'Método desconhecido';
            }

            const wellCard = document.createElement('div');
            wellCard.className = 'well-card';
            wellCard.dataset.originalIndex = index;

            wellCard.innerHTML = `
                <h3>${wellData.wellName} <button class="close-btn" data-original-index="${index}">×</button></h3>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 20px; height: 20px; background-color: rgb(${wellData.R},${wellData.G},${wellData.B}); border-radius: 50%; border: 1px solid #ccc;"></div>
                    <div>
                        <p><strong>Método:</strong> ${wellData.methodName}</p>
                        <p><strong>RGB:</strong> R${wellData.R} G${wellData.G} B${wellData.B}</p>
                        <p><strong>FC:</strong> ${fcValue !== null ? fcValue.toFixed(4).replace('.', ',') : 'Erro'}</p>
                        <p><strong>${currentReductionVariableName}:</strong> ${reductionValue.replace('.', ',')}</p>
                        <p><strong>Data:</strong> ${new Date(wellData.timestamp).toLocaleString('pt-BR')}</p>
                    </div>
                </div>
            `;
            
            wellCard.querySelector('.close-btn').addEventListener('click', (e) => {
                const indexToRemove = parseInt(e.target.dataset.originalIndex, 10);
                selectedWells.splice(indexToRemove, 1);
                localStorage.setItem('selectedWells', JSON.stringify(selectedWells));
                renderAllWells();
                calculateAverage();
                redrawCanvas();
            });

            wellsResultsContainer.appendChild(wellCard);
        });
    }

    function clearAllWells() {
        if (confirm('Tem certeza que deseja limpar todos os poços?')) {
            selectedWells = [];
            localStorage.setItem('selectedWells', JSON.stringify(selectedWells));
            renderAllWells();
            calculateAverage();
            lastExtractedR = 0;
            lastExtractedG = 0;
            lastExtractedB = 0;
            lastClickPosition = null;
            updateExtractedColorPreview();
            redrawCanvas();
        }
    }

    function calculateAverage() {
        if (selectedWells.length === 0) {
            averageFcResultSpan.textContent = 'N/A';
            averageReductionResultSpan.textContent = 'N/A';
            return;
        }

        const validFcValues = selectedWells
            .map(well => calculateFcValue(well.R, well.G, well.B, currentFcFormula))
            .filter(value => value !== null && isFinite(value));
        
        const validReductionValues = selectedWells
            .map(well => {
                const methodFormula = getMethodFormula(well.methodName);
                if (!methodFormula) return null;

                const reductionValueStr = calculateReductionValue(well, methodFormula, selectedWells);
                const reductionValue = parseFloat(reductionValueStr);
                
                return isFinite(reductionValue) ? reductionValue : null;
            })
            .filter(value => value !== null && isFinite(value));

        const averageFc = validFcValues.length > 0 ? validFcValues.reduce((sum, value) => sum + value, 0) / validFcValues.length : null;
        const averageReduction = validReductionValues.length > 0 ? validReductionValues.reduce((sum, value) => sum + value, 0) / validReductionValues.length : null;
        
        averageFcResultSpan.textContent = averageFc !== null ? averageFc.toFixed(4).replace('.', ',') : 'N/A';
        averageReductionResultSpan.textContent = averageReduction !== null ? averageReduction.toFixed(4).replace('.', ',') : 'N/A';
    }

    function updateExtractedColorPreview() {
        if (!extractedColorPreview) return;
        extractedColorPreview.style.backgroundColor = `rgb(${lastExtractedR},${lastExtractedG},${lastExtractedB})`;
        extractedRDisplay.textContent = lastExtractedR;
        extractedGDisplay.textContent = lastExtractedG;
        extractedBDisplay.textContent = lastExtractedB;
    }

    function redrawCanvas() {
        if (!currentImage) {
            ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
            return;
        }

        const canvasWidth = imageCanvas.width;
        const canvasHeight = imageCanvas.height;
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        ctx.save();
        ctx.translate(initialImageDrawX + panX, initialImageDrawY + panY);
        ctx.scale(zoomLevel, zoomLevel);

        ctx.drawImage(currentImage, 0, 0, currentImage.width, currentImage.height, 0, 0, initialImageDrawWidth, initialImageDrawHeight);
        
        // Desenha as caixas dos poços já adicionados
        selectedWells.forEach(well => {
            if (well.clickPosition && well.sampleSize) {
                const sizeInInitialCanvas = well.sampleSize * (initialImageDrawWidth / currentImage.width);
                const rectX = well.clickPosition.x * (initialImageDrawWidth / currentImage.width) - sizeInInitialCanvas / 2;
                const rectY = well.clickPosition.y * (initialImageDrawHeight / currentImage.height) - sizeInInitialCanvas / 2;

                ctx.strokeStyle = 'blue';
                ctx.lineWidth = 2 / zoomLevel;
                ctx.strokeRect(rectX, rectY, sizeInInitialCanvas, sizeInInitialCanvas);
            }
        });

        // Desenha a caixa do último poço extraído (se houver)
        if (lastClickPosition) {
            const selectedSize = parseInt(sampleSizeInput.value, 10);
            const sizeInInitialCanvas = selectedSize * (initialImageDrawWidth / currentImage.width);
            const rectX = lastClickPosition.x * (initialImageDrawWidth / currentImage.width) - sizeInInitialCanvas / 2;
            const rectY = lastClickPosition.y * (initialImageDrawHeight / currentImage.height) - sizeInInitialCanvas / 2;

            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2 / zoomLevel;
            ctx.strokeRect(rectX, rectY, sizeInInitialCanvas, sizeInInitialCanvas);
        }
        
        ctx.restore();
    }
    
    // Certifica-se de que o elemento existe antes de adicionar o event listener
    if (imageUpload) {
        imageUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                fileNameDisplay.textContent = file.name;
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        currentImage = img;
                        offscreenCanvas.width = currentImage.width;
                        offscreenCanvas.height = currentImage.height;
                        offscreenCtx.drawImage(currentImage, 0, 0);
    
                        imageCanvas.width = canvasContainer.clientWidth;
                        imageCanvas.height = canvasContainer.clientHeight;
                        
                        const imgAspectRatio = currentImage.width / currentImage.height;
                        const canvasAspectRatio = imageCanvas.width / imageCanvas.height;
                        
                        if (imgAspectRatio > canvasAspectRatio) {
                            initialImageDrawWidth = imageCanvas.width;
                            initialImageDrawHeight = imageCanvas.width / imgAspectRatio;
                            initialImageDrawX = 0;
                            initialImageDrawY = (imageCanvas.height - initialImageDrawHeight) / 2;
                        } else {
                            initialImageDrawHeight = imageCanvas.height;
                            initialImageDrawWidth = imageCanvas.height * imgAspectRatio;
                            initialImageDrawX = (imageCanvas.width - initialImageDrawWidth) / 2;
                            initialImageDrawY = 0;
                        }
                        
                        zoomLevel = 1.0;
                        panX = 0;
                        panY = 0;
                        lastClickPosition = null;
                        redrawCanvas();
    
                        lastExtractedR = 0;
                        lastExtractedG = 0;
                        lastExtractedB = 0;
                        updateExtractedColorPreview();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                fileNameDisplay.textContent = 'Nenhuma imagem selecionada.';
            }
        });
    }

    imageCanvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            isPanning = true;
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            startPanX = panX;
            startPanY = panY;
            imageCanvas.style.cursor = 'grabbing';
        }
    });

    imageCanvas.addEventListener('mousemove', (e) => {
        if (isPanning) {
            const dx = e.clientX - startMouseX;
            const dy = e.clientY - startMouseY;
            panX = startPanX + dx;
            panY = startPanY + dy;
            redrawCanvas();
        }
    });

    imageCanvas.addEventListener('mouseup', () => {
        isPanning = false;
        imageCanvas.style.cursor = 'grab';
    });
    
    imageCanvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    imageCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const oldZoomLevel = zoomLevel;
        const zoomFactor = 1.1;

        if (e.deltaY < 0) {
            zoomLevel *= zoomFactor;
        } else {
            zoomLevel /= zoomFactor;
        }

        if (zoomLevel < 1.0) zoomLevel = 1.0;
        if (zoomLevel > 10.0) zoomLevel = 10.0;

        const rect = imageCanvas.getBoundingClientRect();
        const cursorX = e.clientX - rect.left - initialImageDrawX;
        const cursorY = e.clientY - rect.top - initialImageDrawY;

        const newPanX = panX - (cursorX - panX) * (zoomLevel / oldZoomLevel - 1);
        const newPanY = panY - (cursorY - panY) * (zoomLevel / oldZoomLevel - 1);
        
        panX = newPanX;
        panY = newPanY;

        redrawCanvas();
    });

    imageCanvas.addEventListener('click', (e) => {
        if (!currentImage) return;

        const selectedSize = parseInt(sampleSizeInput.value, 10);
        if (isNaN(selectedSize) || selectedSize < 1) {
            alert('Por favor, insira um tamanho de pixel válido (número inteiro).');
            return;
        }

        const rect = imageCanvas.getBoundingClientRect();
        
        const clickXInCanvas = (e.clientX - rect.left - initialImageDrawX - panX) / zoomLevel;
        const clickYInCanvas = (e.clientY - rect.top - initialImageDrawY - panY) / zoomLevel;

        const scaleX = currentImage.width / initialImageDrawWidth;
        const scaleY = currentImage.height / initialImageDrawHeight;
        
        const imgX = clickXInCanvas * scaleX;
        const imgY = clickYInCanvas * scaleY;
        
        const halfSize = Math.floor(selectedSize / 2);
        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let pixelCount = 0;
        
        for (let y = -halfSize; y <= halfSize; y++) {
            for (let x = -halfSize; x <= halfSize; x++) {
                const pixelX = Math.round(imgX + x);
                const pixelY = Math.round(imgY + y);
                
                if (pixelX >= 0 && pixelX < currentImage.width && pixelY >= 0 && pixelY < currentImage.height) {
                    const imageData = offscreenCtx.getImageData(pixelX, pixelY, 1, 1).data;
                    totalR += imageData[0];
                    totalG += imageData[1];
                    totalB += imageData[2];
                    pixelCount++;
                }
            }
        }
        
        if (pixelCount > 0) {
            lastExtractedR = Math.round(totalR / pixelCount);
            lastExtractedG = Math.round(totalG / pixelCount);
            lastExtractedB = Math.round(totalB / pixelCount);
            lastClickPosition = { x: imgX, y: imgY };
            updateExtractedColorPreview();
            redrawCanvas();
        } else {
            alert('Não foi possível extrair a cor. Tente clicar em outra área.');
        }
    });

    addWellBtn.addEventListener('click', addWell);

    clearWellsBtn.addEventListener('click', clearAllWells);
    
    // Event listener para carregar fórmulas ao selecionar o método
    methodSelect.addEventListener('change', () => {
        const selectedMethodName = methodSelect.value;
        const selectedMethod = calibrationData.find(entry => entry.methodName === selectedMethodName);

        if (selectedMethod) {
            fcFormulaInput.value = selectedMethod.fcFormula;
            newReductionFormulaInput.value = selectedMethod.reductionFormula;
        } else {
            // Se a seleção for "Nenhum" ou vazia, limpa os campos.
            fcFormulaInput.value = '';
            newReductionFormulaInput.value = '';
        }
        updateFormulasAndVariables();
        renderAllWells();
        calculateAverage();
    });
    
    // Event listeners para as fórmulas de cálculo
    fcFormulaInput.addEventListener('change', () => {
        updateFormulasAndVariables();
        renderAllWells();
        calculateAverage();
    });
    
    reductionVariableNameInput.addEventListener('change', () => {
        updateFormulasAndVariables();
        renderAllWells();
        calculateAverage();
    });

    // Nova lógica para a tabela de calibração
    addCalibrationBtn.addEventListener('click', () => {
        const newMethodName = newMethodNameInput.value.trim();
        const newReductionFormula = newReductionFormulaInput.value.trim();
        const newFcFormula = fcFormulaInput.value.trim();

        if (!newMethodName || !newReductionFormula || !newFcFormula) {
            alert('Por favor, preencha o nome do método e as duas fórmulas.');
            return;
        }

        const existingEntryIndex = calibrationData.findIndex(entry => entry.methodName === newMethodName);
        if (existingEntryIndex > -1) {
            if (confirm(`Já existe uma fórmula para o método "${newMethodName}". Deseja substituí-la?`)) {
                calibrationData[existingEntryIndex].reductionFormula = newReductionFormula;
                calibrationData[existingEntryIndex].fcFormula = newFcFormula;
            } else {
                return;
            }
        } else {
            calibrationData.push({ methodName: newMethodName, reductionFormula: newReductionFormula, fcFormula: newFcFormula });
        }
        
        localStorage.setItem('calibrationData', JSON.stringify(calibrationData));
        renderCalibrationTable();
        
        newMethodNameInput.value = '';
        newReductionFormulaInput.value = '';
        renderAllWells();
        calculateAverage();
    });

    function renderCalibrationTable() {
        if (calibrationData.length === 0) {
            calibrationTableContainer.innerHTML = `<p id="noCalibrationDataMessage" style="text-align: center; color: #888;">Nenhum dado de calibração adicionado ainda.</p>`;
        } else {
            const tableHTML = `
                <table class="calibration-table">
                    <thead>
                        <tr>
                            <th>Nome do Método</th>
                            <th>Fórmula</th>
                            <th>Fórmula FC</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${calibrationData.map((entry, index) => `
                            <tr>
                                <td>${entry.methodName}</td>
                                <td>${entry.reductionFormula}</td>
                                <td>${entry.fcFormula}</td>
                                <td><button class="delete-calibration-btn" data-index="${index}">Excluir</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
            calibrationTableContainer.innerHTML = tableHTML;

            calibrationTableContainer.querySelectorAll('.delete-calibration-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const indexToDelete = parseInt(e.target.dataset.index, 10);
                    calibrationData.splice(indexToDelete, 1);
                    localStorage.setItem('calibrationData', JSON.stringify(calibrationData));
                    renderCalibrationTable();
                    populateMethodSelect();
                });
            });
        }
        populateMethodSelect();
    }

    function populateMethodSelect() {
        const methods = [...new Set(calibrationData.map(item => item.methodName))].sort();
        methodSelect.innerHTML = '';
        if (methods.length > 0) {
            methods.forEach(method => {
                const option = document.createElement('option');
                option.value = method;
                option.textContent = method;
                methodSelect.appendChild(option);
            });
        } else {
             methodSelect.innerHTML = `<option value="">Nenhum</option>`;
        }
    }
    
    exportCsvBtn.addEventListener('click', () => {
        if (selectedWells.length === 0) {
            alert('Não há dados de poços para exportar.');
            return;
        }
        
        // Adiciona o Byte Order Mark (BOM) para garantir a compatibilidade com UTF-8 em softwares como o Excel
        const BOM = "\uFEFF";
        let csvContent = BOM + `Responsável,Nome do Poço,Data e Hora,R,G,B,Cor (Hex),FC,${currentReductionVariableName},Tamanho do Pixel,Método\n`;
        
        selectedWells.forEach(well => {
            const hexColor = rgbToHex(well.R, well.G, well.B);
            const fcValue = calculateFcValue(well.R, well.G, well.B, currentFcFormula);
            
            let reductionValue;
            const methodFormula = getMethodFormula(well.methodName);
            if (methodFormula) {
                 reductionValue = calculateReductionValue(well, methodFormula, selectedWells);
            } else {
                reductionValue = 'Método desconhecido';
            }
            
            const pixelSize = `${well.sampleSize}x${well.sampleSize}`;
            const extractedDateTime = new Date(well.timestamp).toLocaleString('pt-BR');
            
            // Substitui o ponto por vírgula para valores numéricos
            const fcString = fcValue !== null ? fcValue.toFixed(4).toString().replace('.', ',') : 'Erro';
            const reductionString = reductionValue.toString().replace('.', ',');
            
            const row = [responsibleName, well.wellName, extractedDateTime, well.R, well.G, well.B, hexColor, fcString, reductionString, pixelSize, well.methodName];
            csvContent += row.map(item => `"${item}"`).join(',') + '\n';
        });

        csvContent += `\n`;
        if (selectedWells.length > 0) {
            csvContent += `Média FC:,${averageFcResultSpan.textContent}\n`;
            csvContent += `Média ${currentReductionVariableName}:,${averageReductionResultSpan.textContent}\n\n`;
        }
        
        const csvFileName = 'dados_vitakit_pocos.csv';
        const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const csvLink = document.createElement('a');
        if (csvLink.download !== undefined) {
            const url = URL.createObjectURL(csvBlob);
            csvLink.setAttribute('href', url);
            csvLink.setAttribute('download', csvFileName);
            csvLink.style.visibility = 'hidden';
            document.body.appendChild(csvLink);
            csvLink.click();
            document.body.removeChild(csvLink);
        } else {
            alert('Seu navegador não suporta a exportação direta do CSV.');
        }
    });

    loadInitialSettings();
});