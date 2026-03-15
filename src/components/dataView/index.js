import { useEffect, useState } from "react";
import { useMyStateV2 } from "@/context/stateContextV2";
import { HardDriveUpload, FilePlus2 } from "lucide-react";
import OpenApiPanelTab from "@/components/dataView/OpenApiPanelTab";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GridView from "@/components/gridView";
import { VscCircleFilled } from "react-icons/vsc";
import { API_INTEGRATIONS, integrations_list } from "@/components/integrationsView/integrationsConfig";

const DataView = ({ user }) => {
  const contextStateV2 = useMyStateV2();

  const [sheetId, setSheetId] = useState(0);

  const connectedData = contextStateV2?.connectedData;
  const setConnectedData = contextStateV2?.setConnectedData;
  const setViewing = contextStateV2?.setViewing;
  const setIntegrationSidebar = contextStateV2?.setIntegrationSidebar;
  const integrationSidebar = contextStateV2?.integrationSidebar;
  const multiSheetFlag = contextStateV2?.multiSheetFlag;
  const multiSheetData = contextStateV2?.multiSheetData;
  const sheetNames = contextStateV2?.sheetNames;
  const dataSheets = contextStateV2?.dataSheets;
  const activeSheetId = contextStateV2?.activeSheetId;
  const setActiveSheetId = contextStateV2?.setActiveSheetId;
  const setConnectedCols = contextStateV2?.setConnectedCols;

  const sheetSwitchHandler = (sheetName, id) => {
    setConnectedData(multiSheetData[sheetName]);
    setSheetId(id);
  };

  const dataSheetIds = dataSheets ? Object.keys(dataSheets) : [];
  const hasMultipleDataSheets = dataSheetIds.length > 1;
  const showGrid = (connectedData?.length > 0) || hasMultipleDataSheets || integrationSidebar;

  const openIntegrationPlayground = (clickHandlerId) => {
    if (API_INTEGRATIONS.includes(clickHandlerId)) {
      setConnectedData?.([]);
      setConnectedCols?.([]);
      setViewing?.("dataStart");
      setIntegrationSidebar?.(clickHandlerId);
    }
  };

  return (
    <div className="min-w-0 max-w-full px-2 sm:px-4 md:px-6">
      {hasMultipleDataSheets && (
        <div className="flex flex-wrap gap-1 mb-2">
          {dataSheetIds.map((id) => (
            <code
              key={id}
              className={`${id === activeSheetId ? "bg-lychee_blue/30" : "bg-yellow-200/30 cursor-pointer hover:bg-lychee_blue/80 hover:text-lychee_white"} relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold`}
              onClick={() => setActiveSheetId?.(id)}
            >
              {dataSheets[id]?.name || id}
            </code>
          ))}
        </div>
      )}
      {multiSheetFlag && (
        <div className="flex flex-wrap gap-1 mb-2">
          {Object.keys(multiSheetData).map((sheetName, index) => (
            <code
              key={index}
              className={`${sheetName === sheetNames[sheetId] ? "bg-lychee_blue/30" : "bg-yellow-200/30 cursor-pointer hover:bg-lychee_blue/80 hover:text-lychee_white"} relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold`}
              onClick={() => sheetSwitchHandler(sheetName, index)}
            >
              {sheetName}
            </code>
          ))}
        </div>
      )}

      {showGrid ? (
        <div className="relative">
          {!integrationSidebar && setIntegrationSidebar && (
            <OpenApiPanelTab onOpen={() => setIntegrationSidebar("polymarket")} />
          )}
          <div className="min-h-0 w-full max-w-full overflow-auto">
            <GridView />
          </div>
        </div>
      ) : (
        <div className="relative">
          {!(user) && (
            <div className="w-full max-w-md mx-auto py-4">
              <Alert onClick={() => setViewing("register")} className="cursor-pointer">
                <VscCircleFilled className="h-5 w-5" />
                <AlertTitle className="text-xs">Want to save your work?</AlertTitle>
                <AlertDescription className="text-xs">Click here to register.</AlertDescription>
              </Alert>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-6">
            {/* Top row: 2 cells (1 col each), then 2 empty columns */}
            <Card
              className="flex flex-col h-full cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md"
              onClick={() => setViewing("upload")}
            >
              <CardHeader className="w-full items-center justify-center rounded-t-lg py-12 bg-muted/60">
                <HardDriveUpload className="h-12 w-12 text-muted-foreground" />
              </CardHeader>
              <CardContent className="py-4 grow">
                <h3 className="text-sm font-medium leading-none">Upload your own data</h3>
                <p className="text-sm pt-1 text-muted-foreground">
                  Upload your own .csv or Excel. JSON, PDF, more coming soon.
                </p>
              </CardContent>
            </Card>

            <Card
              className="flex flex-col h-full cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md"
              onClick={() => setViewing("newSheet")}
            >
              <CardHeader className="w-full items-center justify-center rounded-t-lg py-12 bg-muted/60">
                <FilePlus2 className="h-12 w-12 text-muted-foreground" />
              </CardHeader>
              <CardContent className="py-4 grow">
                <h3 className="text-sm font-medium leading-none">Start with New sheet</h3>
                <p className="text-sm pt-1 text-muted-foreground">Start with an empty sheet.</p>
              </CardContent>
            </Card>

            {/* Empty cells so integrations start on row 2 */}
            <div className="hidden lg:block" aria-hidden />
            <div className="hidden lg:block" aria-hidden />
            {/* Section label - vertically centered in grid cell */}
            <div className="flex items-center text-xl font-bold text-left min-h-[3rem]">
              Connect directly to an external data source
            </div>

            {/* Integration cards - same UI as integrationsView, 4-column grid */}
            {integrations_list.map((integration, index) => (
              <Card key={index} className="flex flex-col h-full">
                <CardHeader
                  className="w-full items-center rounded-t-lg py-8 min-h-[120px] flex justify-center"
                  style={{ backgroundColor: integration.color }}
                >
                  {integration.icon}
                </CardHeader>
                <CardContent className="py-4 grow">
                  <small className="text-sm font-medium leading-none">{integration.name}</small>
                  <p className="text-sm pt-1 text-muted-foreground line-clamp-2">{integration.description}</p>
                </CardContent>
                <CardFooter className="flex place-content-end">
                  {!integration.live || integration.tags.includes("coming soon") ? (
                    <Button disabled>Coming soon</Button>
                  ) : (
                    <Button onClick={() => openIntegrationPlayground(integration.clickHandler)}>Connect</Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataView;
