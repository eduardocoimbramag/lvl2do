/**
 * Loja (mock) — troca de cristais de energia por produtos físicos.
 * O custo de cada item é em cristais (ver `referralStats.crystals`).
 */

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  /** custo em cristais de energia. */
  cost: number;
  /** chave do ícone (mapeada em ProductCard). */
  iconKey: string;
}

export const STORE_PRODUCTS: Product[] = [
  { id: "sticker", name: "Pacote de Adesivos", description: "Cartela com 12 adesivos pixel art.", category: "Acessórios", cost: 80, iconKey: "sticker" },
  { id: "key", name: "Chaveiro do Herói", description: "Chaveiro de metal da sua classe.", category: "Acessórios", cost: 120, iconKey: "key" },
  { id: "mug", name: "Caneca lvl2do", description: "Caneca de cerâmica de 325ml.", category: "Casa", cost: 180, iconKey: "mug" },
  { id: "bag", name: "Ecobag da Guilda", description: "Sacola de algodão estampada.", category: "Casa", cost: 200, iconKey: "bag" },
  { id: "bracelet", name: "Pulseira de Aventureiro", description: "Pulseira de silicone da guilda.", category: "Acessórios", cost: 220, iconKey: "bracelet" },
  { id: "notebook", name: "Planner de Missões", description: "Caderno para planejar suas quests.", category: "Papelaria", cost: 260, iconKey: "notebook" },
  { id: "mouse", name: "Mousepad XL", description: "Mousepad gamer de 80x30cm.", category: "Setup", cost: 320, iconKey: "mouse" },
  { id: "cap", name: "Boné da Guilda", description: "Boné bordado e ajustável.", category: "Vestuário", cost: 340, iconKey: "cap" },
  { id: "bottle", name: "Garrafa Térmica", description: "Squeeze de inox de 500ml.", category: "Casa", cost: 400, iconKey: "bottle" },
  { id: "shirt", name: "Camiseta lvl2do", description: "Camiseta 100% algodão.", category: "Vestuário", cost: 450, iconKey: "shirt" },
  { id: "poster", name: "Pôster do Personagem", description: "Pôster A2 da arte lendária.", category: "Casa", cost: 500, iconKey: "poster" },
  { id: "kit", name: "Kit Lendário", description: "Camiseta + boné + caneca + adesivos.", category: "Bundle", cost: 900, iconKey: "kit" },
];
