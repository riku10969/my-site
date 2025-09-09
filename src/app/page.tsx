import Top from "./components/top";
import ProjectsIntro from "./components/ProjectsIntoro";
// import Projects from "./components/Projects";
import BackgroundStage from "./components/canvas/BackgroundStage";
import RouteLogoController from "./components/RouteLogoController";

export default function Page() {
  return (
    <>
      <Top />
      <BackgroundStage />
      <RouteLogoController/>
      {/* <Projects/> */}
      <ProjectsIntro />
    </>
  );
}