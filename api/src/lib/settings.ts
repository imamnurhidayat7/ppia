/**
 * Reading site settings.
 *
 * Settings live in a key/value table edited from Admin → Settings. This helper
 * exists because the same read was duplicated in more than one controller, and a
 * missing row has to behave the same everywhere: an absent setting is the empty
 * string, not an error, so a feature that depends on it degrades instead of
 * failing.
 */
import prisma from './prisma';

/** Read one setting, falling back when the row does not exist or is blank. */
export const getSetting = async (key: string, fallback = ''): Promise<string> => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key } });
    return setting?.value?.trim() || fallback;
  } catch (error) {
    // A settings lookup failing must not take down the action that needed it.
    console.error(`[settings] Failed to read "${key}":`, error);
    return fallback;
  }
};

/**
 * The WhatsApp community invite, as configured in Admin → Settings.
 *
 * Named separately because several flows need it and it is easy to typo the key.
 */
export const getWhatsAppGroupLink = (): Promise<string> => getSetting('whatsappGroupLink');
