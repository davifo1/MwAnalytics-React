import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Converte tags do Unity TMP_Text para HTML
 * Suporta: <color>, <b>, <i>, <size>, <br> e outras tags comuns
 */
const parseUnityRichText = (text) => {
  if (!text) return '';

  let html = text;

  // Converter quebras de linha
  html = html.replace(/<br\s*\/?>/gi, '<br />');
  html = html.replace(/\n/g, '<br />');

  // Converter tags de cor do Unity para spans HTML
  // Formato: <color=#RRGGBB> ou <color=red> ou <color=#RRGGBBAA>
  html = html.replace(
    /<color=([^>]+)>([^<]*(?:<(?!\/color>)[^<]*)*)<\/color>/gi,
    (match, color, content) => {
      // Se a cor começar com #, use diretamente
      if (color.startsWith('#')) {
        // Remove alpha se houver (pega apenas os 6 primeiros caracteres após #)
        const hexColor = color.length > 7 ? color.substring(0, 7) : color;
        return `<span style="color: ${hexColor}">${content}</span>`;
      }
      // Mapear nomes de cores Unity para CSS
      const colorMap = {
        'red': '#ff0000',
        'green': '#00ff00',
        'blue': '#0000ff',
        'yellow': '#ffff00',
        'cyan': '#00ffff',
        'magenta': '#ff00ff',
        'white': '#ffffff',
        'black': '#000000',
        'gray': '#808080',
        'grey': '#808080',
        'orange': '#ffa500',
        'purple': '#800080',
        'brown': '#a52a2a',
        'pink': '#ffc0cb',
        'lime': '#00ff00',
        'olive': '#808000',
        'navy': '#000080',
        'teal': '#008080',
        'aqua': '#00ffff'
      };
      const cssColor = colorMap[color.toLowerCase()] || color;
      return `<span style="color: ${cssColor}">${content}</span>`;
    }
  );

  // Converter tags de tamanho
  html = html.replace(
    /<size=(\d+)>([^<]*(?:<(?!\/size>)[^<]*)*)<\/size>/gi,
    (match, size, content) => {
      // Unity usa tamanho em pixels, vamos converter para em
      const emSize = parseInt(size) / 14; // Assumindo 14px como base
      return `<span style="font-size: ${emSize}em">${content}</span>`;
    }
  );

  // Converter tags de negrito
  html = html.replace(/<b>([^<]*(?:<(?!\/b>)[^<]*)*)<\/b>/gi, '<strong>$1</strong>');

  // Converter tags de itálico
  html = html.replace(/<i>([^<]*(?:<(?!\/i>)[^<]*)*)<\/i>/gi, '<em>$1</em>');

  // Converter tags de sublinhado
  html = html.replace(/<u>([^<]*(?:<(?!\/u>)[^<]*)*)<\/u>/gi, '<span style="text-decoration: underline">$1</span>');

  // Converter tags de tachado (strikethrough)
  html = html.replace(/<s>([^<]*(?:<(?!\/s>)[^<]*)*)<\/s>/gi, '<span style="text-decoration: line-through">$1</span>');

  // Converter tags de subscript e superscript
  html = html.replace(/<sub>([^<]*(?:<(?!\/sub>)[^<]*)*)<\/sub>/gi, '<sub>$1</sub>');
  html = html.replace(/<sup>([^<]*(?:<(?!\/sup>)[^<]*)*)<\/sup>/gi, '<sup>$1</sup>');

  // Converter alinhamento (se houver)
  html = html.replace(/<align=([^>]+)>([^<]*(?:<(?!\/align>)[^<]*)*)<\/align>/gi,
    (match, alignment, content) => {
      const alignMap = {
        'left': 'left',
        'center': 'center',
        'right': 'right',
        'justified': 'justify'
      };
      const cssAlign = alignMap[alignment.toLowerCase()] || alignment;
      return `<div style="text-align: ${cssAlign}">${content}</div>`;
    }
  );

  return html;
};

/**
 * Componente RichTextArea que suporta tags Unity TMP_Text
 * Em modo edição: textarea normal
 * Em modo visualização: renderiza HTML com estilos
 */
const RichTextArea = ({
  value = '',
  onChange,
  disabled = false,
  className,
  placeholder,
  ...props
}) => {
  // Se estiver em modo de edição, mostrar textarea normal
  if (!disabled) {
    return (
      <Textarea
        value={value}
        onChange={onChange}
        className={cn(
          "bg-gray-800 border-gray-700 text-gray-200",
          className
        )}
        placeholder={placeholder}
        {...props}
      />
    );
  }

  // Se estiver em modo visualização, renderizar o texto rico
  const parsedHtml = parseUnityRichText(value);

  // Se não houver conteúdo, mostrar placeholder
  if (!value || value.trim() === '') {
    return (
      <div
        className={cn(
          "min-h-[80px] p-2 rounded-md bg-gray-800 border border-gray-700",
          "text-gray-500 text-sm",
          className
        )}
      >
        {placeholder || 'No description available'}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-[80px] p-2 rounded-md bg-gray-800 border border-gray-700",
        "text-gray-200 text-sm prose prose-sm prose-invert max-w-none",
        "overflow-auto",
        className
      )}
      dangerouslySetInnerHTML={{ __html: parsedHtml }}
      style={{
        // Estilos específicos para o rich text
        lineHeight: '1.5',
        wordBreak: 'break-word'
      }}
    />
  );
};

export { RichTextArea };
export default RichTextArea;