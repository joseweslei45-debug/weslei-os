export const GITHUB = 'https://github.com/joseweslei45-debug';

export const PROJETOS = [
  {
    app: 'agenda',
    nome: 'agenda-inteligente-api',
    stack: 'Java · Spring Boot · JPA',
    resumo: 'API REST de agendamento com detecção de conflitos, jornada de trabalho e política de cancelamento.',
  },
  {
    app: 'video',
    nome: 'video-pipeline',
    stack: 'Node.js · BullMQ · Redis · FFmpeg',
    resumo: 'Upload de vídeos com fila assíncrona e workers que geram thumbnails.',
  },
  {
    app: 'transcritor',
    nome: 'transcritor-local',
    stack: 'Python · faster-whisper · Gradio',
    resumo: 'Transcrição de áudio e geração de legendas SRT/VTT 100% offline.',
  },
  {
    app: 'links',
    nome: 'encurtador-url-metricas',
    stack: 'Node.js · Express · SQLite',
    resumo: 'Encurtador de links com analytics de navegador, dispositivo, horário e origem.',
  },
  {
    app: 'financas',
    nome: 'dashboard-financas',
    stack: 'JavaScript · Chart.js',
    resumo: 'Importa extratos CSV/OFX, categoriza gastos e gera gráficos.',
  },
];

export const repo = (nome) => GITHUB + '/' + nome;
