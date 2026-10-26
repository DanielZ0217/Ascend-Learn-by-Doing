# Workplace Atlas

A standalone Three.js gallery for five miniature workplaces. This project is separate from the Ascend learning website in `../web/`.

## View locally

```powershell
cd office-showcase
npm.cmd install
npm.cmd run dev -- --port 4188
```

Open [http://127.0.0.1:4188/](http://127.0.0.1:4188/). Select a company in the bottom dock, drag the room to rotate, scroll to zoom, or use **Auto orbit** and **Reset view**. Left and right arrow keys move between companies when a dock button has focus.

## Build and verify

```powershell
npm.cmd run build
npm.cmd run preview -- --port 4188
npm.cmd run qa
npm.cmd run motion
```

The gallery includes Aperture Studio (software), Northstar Bank, Sora Table (restaurant), Mesa Micro (semiconductor), and Lumen Works (creative studio). The rooms are authored from Three.js meshes and canvas textures using the concept board in `../docs/ui-redesign/company-presets-concept.png` as visual direction. The office sets are actual orbitable 3D scenes.

See [final evidence](artifacts/final-evidence.md) for the visual capture set, checks, and measured limits.
