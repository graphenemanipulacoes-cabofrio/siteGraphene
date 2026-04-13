// Application configuration
export const config = {
  // WhatsApp contact number (with country code, no spaces or dashes)
  WHATSAPP_NUMBER: '5522999361256',
  
  // WhatsApp message base URL
  WHATSAPP_BASE_URL: 'https://wa.me',
  
  // Allowed file types for upload
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  
  // Maximum file size (5MB)
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  
  // Maximum number of files per upload
  MAX_FILES: 15,
  
  // WhatsApp message templates
  WHATSAPP_MESSAGES: {
    contact: 'Olá, vi pelo site e gostaria de falar com um especialista.',
    product: (productName, price) => {
      let message = `Olá! Gostaria de saber mais sobre o produto: *${productName}*`;
      if (price && parseFloat(price) > 0) {
        const formattedPrice = parseFloat(price).toFixed(2).replace('.', ',');
        message += ` (R$ ${formattedPrice})`;
      }
      return message;
    }
  }
};

// Helper function to generate WhatsApp URL
export const getWhatsAppUrl = (message = config.WHATSAPP_MESSAGES.contact) => {
  return `${config.WHATSAPP_BASE_URL}/${config.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};
