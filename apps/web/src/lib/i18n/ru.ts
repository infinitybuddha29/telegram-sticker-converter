import type { Dictionary } from './en';

export const ru: Dictionary = {
  meta: {
    title: 'Конвертер стикеров Telegram',
    description:
      'Конвертируйте анимированные WebP, GIF и MP4 в стикеры Telegram формата VP9 WebM. Бесплатно, без регистрации. Лимиты: 256КБ, 3 секунды, 512px.',
  },
  header: {
    title: 'Конвертер стикеров Telegram',
    subtitle: 'Конвертация анимированных файлов в стикеры VP9 WebM для Telegram',
    requirements: 'Требования Telegram',
  },
  dropzone: {
    title: 'Перетащите анимированный файл сюда',
    subtitle: 'или нажмите для выбора',
    supports: 'Поддерживается: .webp, .gif, .mp4, .mov, .webm \u2022 Максимум 20МБ',
    errorType: 'Неподдерживаемый тип файла \u201c{ext}\u201d. Используйте: .webp, .gif, .mp4, .mov, .webm',
    errorSize: 'Файл слишком большой. Максимальный размер: {size}МБ.',
  },
  status: {
    converting: 'Конвертация\u2026',
    conversionFailed: 'Ошибка конвертации',
    uploading: 'Загрузка',
    queued: 'В очереди',
    encoding: 'Кодирование',
    ready: 'Готово',
    failedLabel: 'Ошибка',
  },
  checklist: {
    title: 'Соответствие требованиям Telegram',
    allPassed: 'Все проверки пройдены',
    someFailed: 'Часть проверок не пройдена',
    webm: 'Контейнер WebM',
    vp9: 'Кодек VP9',
    noAudio: 'Нет звуковой дорожки',
    fps: 'FPS \u2264 30',
    duration: 'Длительность \u2264 3.0с',
    size: 'Размер \u2264 256КБ',
    dimensions: 'Размеры (одна сторона = 512px)',
  },
  result: {
    title: 'Результат',
    telegramReady: 'Готово для Telegram',
    download: 'Скачать стикер WebM',
    fileSize: 'Размер файла',
    dimensions: 'Размеры',
    duration: 'Длительность',
    fps: 'FPS',
    codec: 'Кодек',
    alpha: 'Прозрачность',
    alphaYes: 'Да',
    alphaNo: 'Нет',
    convertAnother: 'Конвертировать другой файл',
  },
  error: {
    title: 'Ошибка конвертации',
    tryAgain: 'Попробовать снова',
    lostConnection: 'Соединение прервано. Попробуйте снова.',
    uploadFailed: 'Ошибка загрузки. Попробуйте снова.',
  },
  footer: 'Регистрация не требуется. Файлы автоматически удаляются через 24 часа.',
};
