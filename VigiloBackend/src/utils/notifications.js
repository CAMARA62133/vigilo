// utils/notifications.js

// Fonction fictive pour envoyer une alerte
export const sendAlertNotification = async ({
  agent,
  message,
  latitude,
  longitude,
}) => {
  try {
    // Ici tu peux envoyer une notification via Email, Push, SMS, WebSocket...
    console.log(`⚠ Alerte d'urgence envoyée par l'agent ${agent.id}`);
    console.log(`Message: ${message}`);
    console.log(`Position: ${latitude}, ${longitude}`);

    // Simuler un délai comme si on envoyait une notification réelle
    await new Promise((resolve) => setTimeout(resolve, 500));

    return true;
  } catch (err) {
    console.error("Erreur lors de l'envoi de la notification:", err);
    throw err;
  }
};
