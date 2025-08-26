document.addEventListener('DOMContentLoaded', () => {
    // Referências a elementos do DOM
    const imageUpload = document.getElementById('imageUpload');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const imageCanvas = document.getElementById('imageCanvas');
    const ctx = imageCanvas.getContext('2d');
    const canvasContainer = document.querySelector('.canvas-container'); 
    
    // Botões de ação principais
    const addWellBtn = document.getElementById('addWellBtn');
    const clearWellsBtn = document.getElementById('clearWellsBtn');

    // Elementos para a pré-visualização da cor extraída da imagem
    const extractedColorPreview = document.getElementById('extractedColorPreview'); 
    const extractedRDisplay = document.getElementById('extractedR');
    const extractedGDisplay = document.getElementById('extractedG');
    const extractedBDisplay = document.getElementById('extractedB');

    // Elementos para os resultados de múltiplos poços
    const wellsResultsContainer = document.getElementById('wellsResultsContainer');
    const noWellsMessage = document.getElementById('noWellsMessage');
    const calculateAverageBtn = document.getElementById('calculateAverageBtn');
    const averageFcResultSpan = document.getElementById('averageFcResult');
    const averageReductionResultSpan = document.getElementById('averageReductionResult');
    const averageReductionLabel = document.getElementById('averageReductionLabel'); 

    // Elementos da seção de calibração e interpolação
    const fcFormulaInput = document.getElementById('fcFormulaInput'); 
    const currentFcFormulaDisplay = document.querySelector('.current-fc-formula-display'); 
    
    // Elementos para o nome da variável de redução
    const reductionVariableNameInput = document.getElementById('reductionVariableNameInput');
    const currentReductionVariableNameDisplay = document.querySelector('.current-reduction-variable-name-display');

    // Elementos para a fórmula de % Redução
    const reductionFormulaInput = document.getElementById('reductionFormulaInput');
    const currentReductionFormulaDisplay = document.querySelector('.current-reduction-formula-display');

    const slopeMValueInput = document.getElementById('slopeMValue'); 
    const yInterceptBValueInput = document.getElementById('yInterceptBValue'); 
    const saveInterpolationBtn = document.getElementById('saveInterpolationBtn');
    const interpolationSaveMessage = document.getElementById('interpolationSaveMessage');
    const currentConfigDisplay = document.querySelector('.current-config-display');

    // Elementos para a média dos Controles Negativos (NOVO)
    const averageNegativeControlFcResultSpan = document.getElementById('averageNegativeControlFcResult');

    // NOVO: Elementos para o tamanho da amostra de pixel
    const sampleSizeInput = document.getElementById('sampleSizeInput');
    const sampleSizeMessage = document.querySelector('.sample-size-message');

    // Variáveis que armazenarão os parâmetros ATUAIS (fórmulas e m, b, nome da variável)
    let currentFcFormula;
    let currentReductionFormula; 
    let currentReductionVariableName; 
    let currentM; 
    let currentB; 
    let currentNegativeControlFcAverage = 0; // NOVO: Média do FC dos Controles Negativos

    let currentImage = null;
    let sampleSize = parseInt(localStorage.getItem('sampleSize')) || 10; // Tamanho da amostra em pixels da IMAGEM ORIGINAL
    let lastExtractedR = 0;
    let lastExtractedG = 0;
    let lastExtractedB = 0;

    // NOVO: Variáveis de Zoom e Pan
    let zoomLevel = 1.0;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startMouseX = 0;
    let startMouseY = 0;
    let startPanX = 0;
    let startPanY = 0;

    // NOVO: Dimensões da imagem quando INICIALMENTE ajustada ao canvas (zoomLevel = 1.0, pan = 0)
    let initialImageDrawX = 0;
    let initialImageDrawY = 0;
    let initialImageDrawWidth = 0;
    let initialImageDrawHeight = 0;

    let selectedWells = []; 
    let selectedNegativeControls = []; // NOVO: Array para armazenar poços de controle negativo

    // Canvas offscreen para extração de pixel precisa
    let offscreenCanvas = document.createElement('canvas');
    let offscreenCtx = offscreenCanvas.getContext('2d');

    // --- Funções para Gerenciar a Calibração e as Fórmulas ---

    function updateInterpolationParameters() {
        const fcFormulaStr = fcFormulaInput.value.trim();
        if (!fcFormulaStr) {
            interpolationSaveMessage.textContent = 'Erro: A Fórmula do Fator de Cor não pode estar vazia.';
            interpolationSaveMessage.style.color = 'red';
            return false;
        }
        currentFcFormula = fcFormulaStr; 
        localStorage.setItem('fcCalculationFormula', currentFcFormula); 
        currentFcFormulaDisplay.textContent = `Fórmula FC Atual: ${currentFcFormula}`;

        const reductionVarNameStr = reductionVariableNameInput.value.trim();
        if (!reductionVarNameStr) {
            interpolationSaveMessage.textContent = 'Erro: O Nome da Variável de Saída não pode estar vazia.';
            interpolationSaveMessage.style.color = 'red';
            return false;
        }
        currentReductionVariableName = reductionVarNameStr;
        localStorage.setItem('reductionVariableName', currentReductionVariableName);
        currentReductionVariableNameDisplay.textContent = `Nome da Variável de Saída Atual: ${currentReductionVariableName}`;
        // Atualiza labels dinamicamente
        averageReductionLabel.textContent = `Média ${currentReductionVariableName} dos Poços:`; // Atualizado

        const reductionFormulaStr = reductionFormulaInput.value.trim();
        if (!reductionFormulaStr) {
            interpolationSaveMessage.textContent = 'Erro: A Fórmula de % Redução não pode estar vazia.';
            interpolationSaveMessage.style.color = 'red';
            return false;
        }
        currentReductionFormula = reductionFormulaStr;
        localStorage.setItem('reductionCalculationFormula', currentReductionFormula);
        currentReductionFormulaDisplay.textContent = `Fórmula ${currentReductionVariableName} Atual: ${currentReductionFormula}`;

        const m = parseFloat(slopeMValueInput.value);
        const b = parseFloat(yInterceptBValueInput.value);

        if (isNaN(m) || isNaN(b)) {
            interpolationSaveMessage.textContent = 'Erro: Verifique os valores de Inclinação (m) e Intercepto (b).';
            interpolationSaveMessage.style.color = 'red';
            return false;
        }

        currentM = m;
        currentB = b;

        interpolationSaveMessage.textContent = 'Equação e Fórmulas salvas com sucesso!';
        interpolationSaveMessage.style.color = '#28a745';
        currentConfigDisplay.textContent = `Parâmetros (m, b): ${currentM.toFixed(4)}, ${currentB.toFixed(4)}`;
        
        localStorage.setItem('lineEquation', JSON.stringify({ m: currentM, b: currentB }));
        
        setTimeout(() => {
            interpolationSaveMessage.textContent = '';
        }, 3000);

        // Re-renderizar e re-calcular os resultados existentes com as novas fórmulas
        renderAllWells(); // Agora renderiza todos os poços
        calculateAverage();
        calculateNegativeControlAverage(); 

        return true;
    }

    function loadInterpolationParameters() {
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

        const savedReductionFormula = localStorage.getItem('reductionCalculationFormula');
        if (savedReductionFormula) {
            reductionFormulaInput.value = savedReductionFormula;
        } else {
            reductionFormulaInput.value = 'm * FC + b';
        }

        const savedLineEquation = localStorage.getItem('lineEquation');
        if (savedLineEquation) {
            const parsedEquation = JSON.parse(savedLineEquation);
            slopeMValueInput.value = parsedEquation.m;
            yInterceptBValueInput.value = parsedEquation.b;
        } else {
            slopeMValueInput.value = '-42.4990';
            yInterceptBValueInput.value = '162.4984';
        }
        updateInterpolationParameters(); // Carrega e aplica os parâmetros ao iniciar
    }

    // --- Funções de Cálculo ---
    function calculateResults(R, G, B) {
        if (isNaN(R) || isNaN(G) || isNaN(B) || R < 0 || R > 255 || G < 0 || G > 255 || B < 0 || B > 255) {
            return { FC: 'RGB Inválido', Reduction: 'RGB Inválido', valid: false };
        }

        let FC;
        try {
            const fcFormulaFunc = new Function('R', 'G', 'B', 'return (' + currentFcFormula + ');');
            FC = fcFormulaFunc(R, G, B);

            if (isNaN(FC) || !isFinite(FC)) { 
                 return { FC: 'Fórmula inválida/Divisão por Zero', Reduction: 'Erro na fórmula do FC', valid: false };
            }
        } catch (e) {
            console.error("Erro ao avaliar fórmula do FC:", e);
            return { FC: 'Erro na fórmula do FC', Reduction: 'Erro na fórmula do FC', valid: false };
        }
        
        let percentReductionBrute;
        try {
            // AQUI ESTÁ A MUDANÇA: Adiciona CN_FC_Media como parâmetro da função da fórmula
            const reductionFormulaFunc = new Function('FC', 'm', 'b', 'CN_FC_Media', 'return (' + currentReductionFormula + ');');
            percentReductionBrute = reductionFormulaFunc(parseFloat(FC), currentM, currentB, currentNegativeControlFcAverage); 

            if (isNaN(percentReductionBrute) || !isFinite(percentReductionBrute)) {
                return { FC: FC.toFixed(4), Reduction: 'Erro na fórmula de Redução', valid: false };
            }
        } catch (e) {
            console.error("Erro ao avaliar fórmula de % Redução:", e);
            return { FC: FC.toFixed(4), Reduction: 'Erro na fórmula de Redução', valid: false };
        }
        
        let percentReductionFinal;
        if (percentReductionBrute > 100) {
            percentReductionFinal = 100;
        } else if (percentReductionBrute < 0) {
            percentReductionFinal = 0;
        } else {
            percentReductionFinal = percentReductionBrute;
        }

        return {
            FC: FC.toFixed(4),
            Reduction: percentReductionFinal.toFixed(2), 
            valid: true
        };
    }

    // --- Funções para Manuseio de Poços Múltiplos (Normais e Controles Negativos) ---

    // Função genérica para adicionar poço (Normal ou CN)
    function addWell(R, G, B, type = 'normal') { // type pode ser 'normal' ou 'negative_control'
        if (R === 0 && G === 0 && B === 0) { 
            alert('Nenhum RGB extraído ou valores inválidos para adicionar. Clique na imagem primeiro para extrair a cor do poço.');
            return;
        }
        
        if (!updateInterpolationParameters()) { // Garante que os parâmetros estejam atualizados
            return; 
        }

        const results = calculateResults(R, G, B);

        const wellData = {
            R: R,
            G: G,
            B: B,
            FC: results.FC,
            Reduction: results.Reduction,
            isValid: results.valid,
            type: type // Adiciona o tipo ao objeto wellData
        };

        if (type === 'normal') {
            selectedWells.push(wellData);
        } else if (type === 'negative_control') {
            selectedNegativeControls.push(wellData);
        }
        
        renderAllWells(); // Sempre renderiza todos os poços após adicionar um
        calculateAverage(); // Recalcula a média dos poços normais
        calculateNegativeControlAverage(); // Recalcula a média dos CNs
    }
    
    // NOVO: Função para renderizar TODOS os poços (normais e CNs) no mesmo container
    function renderAllWells() {
        wellsResultsContainer.innerHTML = ''; // Limpa o container
        const allWells = [...selectedWells, ...selectedNegativeControls]; // Combina os arrays

        if (allWells.length === 0) {
            noWellsMessage.style.display = 'block';
            return;
        }
        noWellsMessage.style.display = 'none'; 

        // Ordena para que os CNs apareçam primeiro, seguidos pelos poços normais
        allWells.sort((a, b) => {
            if (a.type === 'negative_control' && b.type === 'normal') return -1;
            if (a.type === 'normal' && b.type === 'negative_control') return 1;
            return 0; // Mantém a ordem original dentro do mesmo tipo
        });

        allWells.forEach((wellData, index) => {
            // O displayId agora é global para a lista combinada
            wellsResultsContainer.appendChild(createWellCard(wellData, index + 1)); 
        });
    }

    // Função auxiliar para criar o card de um poço (reutilizada para normal e CN)
    function createWellCard(wellData, displayId) {
        const wellCard = document.createElement('div');
        wellCard.className = 'well-card';

        // Adiciona classe específica para CNs para estilização
        if (wellData.type === 'negative_control') {
            wellCard.classList.add('negative-control-card');
        }

        // Armazena o índice original e o tipo para remoção
        const originalIndex = wellData.type === 'normal' ? selectedWells.indexOf(wellData) : selectedNegativeControls.indexOf(wellData);
        wellCard.dataset.originalIndex = originalIndex;
        wellCard.dataset.wellType = wellData.type; 

        const fcColor = wellData.isValid ? '#007bff' : 'red';
        const reductionColor = wellData.isValid ? '#007bff' : 'red';

        const reductionDisplayValue = wellData.Reduction + (currentReductionVariableName.includes('%') ? '' : '%');
        
        // A exibição da redução só faz sentido para poços normais (não CN)
        const reductionHtml = wellData.type === 'normal' ? `<p><strong>${currentReductionVariableName}:</strong> <span style="color:${reductionColor};">${reductionDisplayValue}</span></p>` : '';
        const wellTypeLabel = wellData.type === 'negative_control' ? 'CN ' : 'Poço ';

        wellCard.innerHTML = `
            <h3>${wellTypeLabel}${displayId} <button class="close-btn" data-original-index="${originalIndex}" data-type="${wellData.type}">×</button></h3>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 20px; height: 20px; background-color: rgb(${wellData.R},${wellData.G},${wellData.B}); border-radius: 50%; border: 1px solid #ccc;"></div>
                <div>
                    <p><strong>RGB:</strong> R${wellData.R} G${wellData.G} B${wellData.B}</p>
                    <p><strong>FC:</strong> <span style="color:${fcColor};">${wellData.FC}</span></p>
                    ${reductionHtml}
                </div>
            </div>
        `;

        wellCard.querySelector('.close-btn').addEventListener('click', (e) => {
            const indexToRemove = parseInt(e.target.dataset.originalIndex);
            const typeToRemove = e.target.dataset.type;

            if (typeToRemove === 'normal') {
                selectedWells.splice(indexToRemove, 1);
            } else if (typeToRemove === 'negative_control') {
                selectedNegativeControls.splice(indexToRemove, 1);
            }
            renderAllWells(); // Re-renderiza tudo
            calculateAverage();
            calculateNegativeControlAverage();
        });
        return wellCard;
    }

    function clearAllWells() {
        if (confirm('Tem certeza que deseja limpar todos os poços (normais e controles negativos)?')) {
            selectedWells = [];
            selectedNegativeControls = []; 
            renderAllWells(); // Renderiza vazio
            averageFcResultSpan.textContent = 'Aguardando cálculo...';
            averageReductionResultSpan.textContent = 'Aguardando cálculo...';
            averageNegativeControlFcResultSpan.textContent = 'Aguardando cálculo...'; 
            currentNegativeControlFcAverage = 0; 
            lastExtractedR = 0; 
            lastExtractedG = 0;
            lastExtractedB = 0;
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

        let totalFC = 0;
        let totalReduction = 0;
        let validWellsCount = 0;

        selectedWells.forEach(well => {
            if (well.isValid && !isNaN(parseFloat(well.FC)) && !isNaN(parseFloat(well.Reduction))) {
                totalFC += parseFloat(well.FC);
                totalReduction += parseFloat(well.Reduction);
                validWellsCount++;
            }
        });

        if (validWellsCount > 0) {
            averageFcResultSpan.textContent = (totalFC / validWellsCount).toFixed(4);
            averageReductionResultSpan.textContent = `${(totalReduction / validWellsCount).toFixed(2)}${currentReductionVariableName.includes('%') ? '' : '%'}`;
        } else {
            averageFcResultSpan.textContent = 'N/A (nenhum poço válido)';
            averageReductionResultSpan.textContent = 'N/A (nenhum poço válido)';
        }
    }

    // NOVA FUNÇÃO: Calcula a média do FC dos Controles Negativos
    function calculateNegativeControlAverage() {
        if (selectedNegativeControls.length === 0) {
            averageNegativeControlFcResultSpan.textContent = 'N/A';
            currentNegativeControlFcAverage = 0;
            return;
        }

        let totalFC = 0;
        let validCNCount = 0;

        selectedNegativeControls.forEach(cn => {
            if (cn.isValid && !isNaN(parseFloat(cn.FC))) {
                totalFC += parseFloat(cn.FC);
                validCNCount++;
            }
        });

        if (validCNCount > 0) {
            currentNegativeControlFcAverage = (totalFC / validCNCount);
            averageNegativeControlFcResultSpan.textContent = currentNegativeControlFcAverage.toFixed(4);
        } else {
            averageNegativeControlFcResultSpan.textContent = 'N/A (nenhum CN válido)';
            currentNegativeControlFcAverage = 0;
        }
        // Após recalcular a média do CN, é crucial re-renderizar e re-calcular os poços normais
        // pois a fórmula de redução deles pode depender desse valor.
        renderAllWells(); // Garante que a exibição de FCs e Redução dos poços normais é atualizada
        calculateAverage();
    }

    // --- Funções de Preview de Cor (Apenas extraída da imagem agora) ---
    function updateExtractedColorPreview() {
        if (!extractedColorPreview) return; 

        extractedColorPreview.style.backgroundColor = `rgb(${lastExtractedR},${lastExtractedG},${lastExtractedB})`;
        extractedRDisplay.textContent = lastExtractedR;
        extractedGDisplay.textContent = lastExtractedG;
        extractedBDisplay.textContent = lastExtractedB;
    }

    // NOVO: Função para redesenhar a imagem com zoom e pan
    function redrawCanvas() {
        if (!currentImage) {
            ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
            return;
        }

        const canvasWidth = imageCanvas.width;
        const canvasHeight = imageCanvas.height;

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.save(); // Salva o estado original (sem transformações)

        // Aplica transformações de pan e zoom
        // Traduz para o ponto inicial de desenho da imagem + deslocamento de pan
        ctx.translate(initialImageDrawX + panX, initialImageDrawY + panY);
        // Aplica o zoom, escalando a partir do ponto de origem atual
        ctx.scale(zoomLevel, zoomLevel);

        // Desenha a imagem. As coordenadas (0,0) para drawImage são agora o ponto de origem transformado.
        ctx.drawImage(currentImage, 0, 0, currentImage.width, currentImage.height,
                      0, 0, initialImageDrawWidth, initialImageDrawHeight);

        ctx.restore(); // Restaura o contexto do canvas para o estado original (sem transformações)
    }


    // --- Event Listeners ---

    // Define o valor inicial do input e carrega parâmetros
    sampleSizeInput.value = sampleSize;
    loadInterpolationParameters();
    renderAllWells(); // Agora renderiza todos os poços ao carregar
    updateExtractedColorPreview(); // Atualiza a pré-visualização da cor extraída ao iniciar
    calculateNegativeControlAverage(); // Calcula a média do CN ao iniciar

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

                    // Garante que o canvas visível tem o tamanho correto do container
                    imageCanvas.width = canvasContainer.clientWidth;
                    imageCanvas.height = canvasContainer.clientHeight;
                    
                    // Calcula as dimensões iniciais para ajustar a imagem ao canvas
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

                    // Reinicia zoom e pan ao carregar nova imagem
                    zoomLevel = 1.0;
                    panX = 0;
                    panY = 0;

                    redrawCanvas(); // Desenha a imagem recém-carregada

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
            ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
            currentImage = null;
            imageCanvas.width = 0;
            imageCanvas.height = 0;
            offscreenCanvas.width = 0;
            offscreenCanvas.height = 0;
            lastExtractedR = 0; 
            lastExtractedG = 0;
            lastExtractedB = 0;
            updateExtractedColorPreview();
        }
    });

    // NOVO: Event listener para Zoom (roda do mouse)
    imageCanvas.addEventListener('wheel', (event) => {
        if (!currentImage) return;

        event.preventDefault(); // Previne o scroll da página

        const rect = imageCanvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left; // Posição do mouse no canvas
        const mouseY = event.clientY - rect.top;

        const zoomFactor = 1.1; // Fator de zoom (10% a cada vez)
        const oldZoomLevel = zoomLevel;

        if (event.deltaY < 0) { // Roda para cima: Zoom In
            zoomLevel *= zoomFactor;
        } else { // Roda para baixo: Zoom Out
            zoomLevel /= zoomFactor;
        }

        // Limita o nível de zoom para evitar valores extremos
        zoomLevel = Math.max(0.1, Math.min(zoomLevel, 10.0)); // De 10% a 1000% de zoom

        // Ajusta o pan para que o ponto do mouse permaneça fixo após o zoom
        // Calcula a coordenada do mouse relativa à imagem *com o zoom e pan atual*
        const imgCoordX = (mouseX - (initialImageDrawX + panX)) / oldZoomLevel;
        const imgCoordY = (mouseY - (initialImageDrawY + panY)) / oldZoomLevel;

        // Calcula o novo pan para que essa coordenada da imagem se alinhe com mouseX, mouseY com o novo zoom
        panX = mouseX - (imgCoordX * zoomLevel) - initialImageDrawX;
        panY = mouseY - (imgCoordY * zoomLevel) - initialImageDrawY;

        redrawCanvas();
    }, { passive: false }); // 'passive: false' permite preventDefault

    // NOVO: Event listeners para Pan (clicar e arrastar)
    imageCanvas.addEventListener('mousedown', (event) => {
        if (!currentImage) return;
        isPanning = true;
        startMouseX = event.clientX;
        startMouseY = event.clientY;
        startPanX = panX; // Salva o pan inicial ao começar a arrastar
        startPanY = panY;
        imageCanvas.style.cursor = 'grabbing'; // Altera o cursor
    });

    imageCanvas.addEventListener('mousemove', (event) => {
        if (!currentImage) return;

        if (isPanning) {
            const dx = event.clientX - startMouseX; // Diferença X desde o clique inicial
            const dy = event.clientY - startMouseY; // Diferença Y desde o clique inicial
            panX = startPanX + dx; // Novo pan X
            panY = startPanY + dy; // Novo pan Y
            redrawCanvas();
        }
    });

    imageCanvas.addEventListener('mouseup', () => {
        isPanning = false;
        imageCanvas.style.cursor = 'grab'; // Restaura o cursor
    });

    imageCanvas.addEventListener('mouseleave', () => {
        isPanning = false;
        imageCanvas.style.cursor = 'grab'; // Restaura o cursor se o mouse sair do canvas enquanto arrasta
    });

    // Define o cursor inicial para indicar que é arrastável
    imageCanvas.style.cursor = 'grab';

    imageCanvas.addEventListener('click', (event) => {
        if (!currentImage) {
            alert('Por favor, carregue uma imagem primeiro para extrair o RGB.');
            return;
        }
        
        const rect = imageCanvas.getBoundingClientRect();
        const clickXInCanvas = (event.clientX - rect.left);
        const clickYInCanvas = (event.clientY - rect.top);

        // Converte as coordenadas do clique no canvas (já com zoom/pan aplicados visualmente)
        // para coordenadas na IMAGEM ORIGINAL (offscreenCanvas) para amostragem.

        // Posição atual do canto superior esquerdo da imagem no canvas visível
        const currentImgXOnCanvas = initialImageDrawX + panX;
        const currentImgYOnCanvas = initialImageDrawY + panY;

        // Coordenadas do clique relativas à imagem (já com zoom e pan aplicadas)
        const xRelativeToZoomedImage = clickXInCanvas - currentImgXOnCanvas;
        const yRelativeToZoomedImage = clickYInCanvas - currentImgYOnCanvas;

        // Coordenadas na imagem se ela estivesse apenas com o ajuste inicial (sem zoom/pan)
        const xOnInitialScale = xRelativeToZoomedImage / zoomLevel;
        const yOnInitialScale = yRelativeToZoomedImage / zoomLevel;

        // Coordenadas na imagem ORIGINAL (em pixels da imagem original)
        const imageXOnOriginal = (xOnInitialScale / initialImageDrawWidth) * currentImage.width;
        const imageYOnOriginal = (yOnInitialScale / initialImageDrawHeight) * currentImage.height;

        const halfSampleSizeOriginal = Math.floor(sampleSize / 2); // Metade do tamanho da amostra em pixels originais

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let pixelCount = 0;

        // Loop para amostrar pixels da imagem original
        for (let i = -halfSampleSizeOriginal; i <= halfSampleSizeOriginal; i++) {
            for (let j = -halfSampleSizeOriginal; j <= halfSampleSizeOriginal; j++) {
                const sampleX = Math.max(0, Math.min(currentImage.width - 1, Math.round(imageXOnOriginal + i))); 
                const sampleY = Math.max(0, Math.min(currentImage.height - 1, Math.round(imageYOnOriginal + j))); 

                try {
                    const pixelData = offscreenCtx.getImageData(sampleX, sampleY, 1, 1).data;

                    if (pixelData[3] > 0) { 
                        totalR += pixelData[0];
                        totalG += pixelData[1];
                        totalB += pixelData[2];
                        pixelCount++;
                    }
                } catch (e) {
                    console.error("Erro ao obter pixel data do offscreen canvas:", e);
                    alert("Erro ao ler pixel da imagem. Isso pode acontecer se a imagem for de uma fonte externa (online) ou estiver corrompida. Tente carregar uma imagem localmente salva.");
                    return; 
                }
            }
        }

        if (pixelCount === 0) {
            alert("Não foi possível extrair a cor do pixel. Isso pode ocorrer se a área clicada for totalmente transparente ou fora da imagem. Tente clicar em outra área do poço.");
            return;
        }

        lastExtractedR = Math.round(totalR / pixelCount);
        lastExtractedG = Math.round(totalG / pixelCount);
        lastExtractedB = Math.round(totalB / pixelCount);

        updateExtractedColorPreview();
        
        // --- Desenha o quadrado de amostragem no canvas visível ---
        redrawCanvas(); // Redesenha a imagem para limpar qualquer quadrado anterior
        
        // Converte o centro da amostra (em pixels da imagem original) para coordenadas do canvas visível
        // Isso é necessário para desenhar o quadrado no lugar correto após zoom/pan
        const scaleToInitialCanvas = initialImageDrawWidth / currentImage.width;
        const boxXOnInitialScale = imageXOnOriginal * scaleToInitialCanvas;
        const boxYOnInitialScale = imageYOnOriginal * scaleToInitialCanvas;

        // Aplica zoom e pan para obter a posição final de desenho no canvas
        const finalBoxX = currentImgXOnCanvas + (boxXOnInitialScale * zoomLevel);
        const finalBoxY = currentImgYOnCanvas + (boxYOnInitialScale * zoomLevel);

        // Calcula o tamanho do quadrado de amostragem no canvas visível
        const sampleSizeOnCanvas = sampleSize * scaleToInitialCanvas * zoomLevel;
        const halfSampleSizeOnCanvas = sampleSizeOnCanvas / 2;

        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 2;
        ctx.strokeRect(finalBoxX - halfSampleSizeOnCanvas, finalBoxY - halfSampleSizeOnCanvas, sampleSizeOnCanvas, sampleSizeOnCanvas);
    });

    // NOVO: Listener para o input de tamanho da amostra
    sampleSizeInput.addEventListener('input', () => {
        let value = parseInt(sampleSizeInput.value);
        if (isNaN(value) || value < 1) {
            sampleSizeMessage.textContent = 'O valor deve ser um número inteiro positivo.';
            sampleSizeMessage.style.color = 'red';
            sampleSizeInput.value = sampleSize; // Reverte para o último valor válido
            return;
        }
        sampleSize = value;
        localStorage.setItem('sampleSize', sampleSize);
        sampleSizeMessage.textContent = `Tamanho da amostra atualizado para ${sampleSize}x${sampleSize}.`;
        sampleSizeMessage.style.color = '#28a745';
        setTimeout(() => {
            sampleSizeMessage.textContent = '';
        }, 3000);
    });

    addWellBtn.addEventListener('click', () => {
        if (lastExtractedR === 0 && lastExtractedG === 0 && lastExtractedB === 0) {
            alert('Nenhum RGB extraído. Clique na imagem primeiro para extrair a cor do poço.');
            return;
        }

        const isNegativeControl = confirm('Deseja adicionar este poço como "Controle Negativo"? Clique em "Cancelar" para adicionar como "Poço Normal".');
        
        if (isNegativeControl) {
            addWell(lastExtractedR, lastExtractedG, lastExtractedB, 'negative_control');
        } else {
            addWell(lastExtractedR, lastExtractedG, lastExtractedB, 'normal');
        }
    });

    clearWellsBtn.addEventListener('click', clearAllWells);
    calculateAverageBtn.addEventListener('click', () => { // Renomeado o botão, recalcula tudo
        calculateAverage();
        calculateNegativeControlAverage();
    });
    saveInterpolationBtn.addEventListener('click', updateInterpolationParameters);

    // Adicione esta nova referência de elemento para o botão de Exportar para CSV
    const exportCsvBtn = document.getElementById('exportCsvBtn');

    // ... (restante do seu código)

    // Event Listener para o botão de Exportar para CSV (ATUALIZADO PARA INCLUIR CNS)
    exportCsvBtn.addEventListener('click', () => {
        if (selectedWells.length === 0 && selectedNegativeControls.length === 0) {
            alert('Não há poços nem controles negativos para exportar.');
            return;
        }

        let csvContent = '';

        // Seção para Controles Negativos
        if (selectedNegativeControls.length > 0) {
            csvContent += 'Controles Negativos\n';
            const cnHeaders = ['CN', 'R', 'G', 'B', 'FC'];
            csvContent += cnHeaders.join(',') + '\n';
            selectedNegativeControls.forEach((cn, index) => {
                const displayId = index + 1;
                const fcValue = cn.isValid ? cn.FC : 'Erro';
                const row = [displayId, cn.R, cn.G, cn.B, fcValue];
                csvContent += row.map(item => `"${item}"`).join(',') + '\n';
            });
            csvContent += `Média FC CNs:,${averageNegativeControlFcResultSpan.textContent}\n\n`; // Usa o span diretamente
        }

        // Seção para Poços Normais
        if (selectedWells.length > 0) {
            csvContent += 'Poços Normais\n';
            const headers = ['Poço', 'R', 'G', 'B', 'FC', currentReductionVariableName];
            csvContent += headers.join(',') + '\n';
            selectedWells.forEach((well, index) => {
                const displayId = index + 1;
                const fcValue = well.isValid ? well.FC : 'Erro';
                const reductionValue = well.isValid ? `${well.Reduction}${currentReductionVariableName.includes('%') ? '' : '%'}` : 'Erro';
                
                const row = [displayId, well.R, well.G, well.B, fcValue, reductionValue];
                csvContent += row.map(item => `"${item}"`).join(',') + '\n';
            });
            csvContent += `Média FC:,${averageFcResultSpan.textContent}\n`;
            csvContent += `Média ${currentReductionVariableName}:,${averageReductionResultSpan.textContent}\n\n`;
        }

        // Cria um Blob com o conteúdo CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        // Cria um link temporário para download
        const link = document.createElement('a');
        if (link.download !== undefined) { 
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'dados_vitakit_pocos_e_cns.csv'); // Nome do arquivo atualizado
            link.style.visibility = 'hidden'; 
            document.body.appendChild(link);
            link.click(); 
            document.body.removeChild(link); 
        } else {
            alert('Seu navegador não suporta a exportação direta de arquivos. Por favor, copie os dados manualmente.');
        }
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/Calculadora-VITAKIT/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registrado com sucesso:', registration);
                })
                .catch(error => {
                    console.log('Falha ao registrar Service Worker:', error);
                });
        });
    }
});