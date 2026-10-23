type MessageValues = Record<string, string | number>;

export function t(key: string, values?: MessageValues) {
  const substitutions = values && Object.values(values).map(String);
  return chrome.i18n.getMessage(key, substitutions) || key;
}

const locale = chrome.i18n.getUILanguage().toLowerCase().startsWith("ja")
  ? "ja"
  : "en";
document.documentElement.lang = locale;
document.title = t("appName");
