import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const languageLabel = (i18n.language || "en").split("-")[0].toUpperCase();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    fetch(`/set-language?lang=${encodeURIComponent(lang)}`, {
      credentials: "same-origin",
    })
      .catch(() => null)
      .finally(() => {
        window.location.reload();
      });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Globe className="h-5 w-5 text-primary" />
          <span className="sr-only">Switch language</span>
          <span className="absolute -top-1 -right-1 rounded bg-primary px-1 text-[10px] font-bold leading-[1.1] text-white">
            {languageLabel}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => changeLanguage('en')}
          className={i18n.language === 'en' ? 'bg-accent' : ''}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLanguage('ar')}
          className={i18n.language === 'ar' ? 'bg-accent' : ''}
        >
          العربية
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
