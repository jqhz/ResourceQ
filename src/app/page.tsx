"use client";

import { useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import ManageTab from "@src/components/ManageTab";
import QueueTab from "@src/components/QueueTab";

export default function Home() {
  const [tab, setTab] = useState(0);

  return (
    <>
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div">
            ResourceQ
          </Typography>
        </Toolbar>
        <Tabs
          value={tab}
          onChange={(_event, value: number) => setTab(value)}
          sx={{ px: 2 }}
        >
          <Tab label="Manage" />
          <Tab label="Queue" />
        </Tabs>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box hidden={tab !== 0}>{tab === 0 && <ManageTab />}</Box>
        <Box hidden={tab !== 1}>{tab === 1 && <QueueTab />}</Box>
      </Container>
    </>
  );
}
