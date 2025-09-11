import InfiniteMarquee from "../InfiniteMarquee";

export default function Works() {
  const imagesGraphic = [
    "/works/graphic1.png","/works/graphic2.png","/works/graphic3.png",
    // 将来ここに7枚追加 → 10枚になってもOK
  ];
  const imagesWeb = [
    "/works/web1.png","/works/web2.png","/works/web3.png",
    // 同様に増やしていける
  ];

  return (
    <section className="bg-[#333] text-white py-16">
      <h2 className="text-center text-2xl mb-8">Works</h2>

      <div className="mb-8">
        <h3 className="text-teal-400 mb-4">Graphic</h3>
        <InfiniteMarquee images={imagesGraphic} direction="right" speed={26} itemWidth={220} gap={18} />
      </div>

      <div>
        <h3 className="text-purple-400 mb-4">Web</h3>
        <InfiniteMarquee images={imagesWeb} direction="left" speed={24} itemWidth={220} gap={18} />
      </div>
    </section>
  );
}
