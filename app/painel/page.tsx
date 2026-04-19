import Link from "next/link";

const sections = [
  { title: "PDV / Balcão", desc: "Atendimento rápido.", href: "/pdv", emoji: "🏪" },
  { title: "Pedidos", desc: "Gerenciar pedidos.", href: "/admin/pedidos", emoji: "📦" },
  { title: "Produtos", desc: "Editar produtos.", href: "/admin/produtos", emoji: "🍕" },
  { title: "Categorias", desc: "Organizar cardápio.", href: "/admin/categorias", emoji: "🗂️" },
  { title: "Adicionais", desc: "Extras e bordas.", href: "/admin/additionals", emoji: "➕" },
  { title: "Combos", desc: "Criar combos.", href: "/admin/combos", emoji: "🎁" },
  { title: "Cardápio", desc: "Ver site do cliente.", href: "/", emoji: "📱" },
];

export default function PainelPage() {
  return (
    <main className="min-h-screen bg-white text-black px-4 py-6">
      
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-red-600">
          Painel de Controle
        </h1>
        <p className="text-gray-600 mt-1 text-sm md:text-base">
          Gerencie sua pizzaria de forma rápida e simples.
        </p>
      </div>

      {/* BOTÕES RÁPIDOS */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <Link
          href="/pdv"
          className="flex-shrink-0 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          PDV
        </Link>

        <Link
          href="/admin/pedidos"
          className="flex-shrink-0 border border-red-600 text-red-600 px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Pedidos
        </Link>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {sections.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-xl border border-gray-200 p-4 flex flex-col items-center justify-center text-center shadow-sm hover:border-red-400"
          >
            <div className="text-2xl mb-2">{item.emoji}</div>

            <h2 className="text-sm md:text-base font-semibold">
              {item.title}
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              {item.desc}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}