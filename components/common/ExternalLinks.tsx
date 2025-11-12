export default function ExternalLinks() {
  const links = [
    {
      name: 'yogibo',
      url: 'https://yogibo.jp/',
      icon: '🛋️',
    },
    {
      name: 'activo',
      url: 'https://activo.jp/',
      icon: '🚗',
    },
    {
      name: '公式LINE',
      url: 'https://line.me/',
      icon: '💬',
    },
    {
      name: '寄付',
      url: 'https://the-ayumi.jp/donation/',
      icon: '❤️',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">関連リンク</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {links.map((link) => (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <span className="text-3xl mb-2">{link.icon}</span>
            <span className="text-sm font-medium text-gray-700">{link.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}



