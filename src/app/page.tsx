import TopSection from "./components/sections/TopSection";
import ProjectsIntro from "./components/sections/ProjectsIntoro";
import BackgroundStage from "./components/webgl/BackgroundStage";

export default function Page() {
  return (
    <>
      <TopSection />
      <BackgroundStage />
      <ProjectsIntro />
    </>
  );
}
