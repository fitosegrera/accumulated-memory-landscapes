import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import com.neurosky.thinkgear.*;

BluetoothAdapter bluetoothAdapter;
TGDevice tgDevice;

final boolean rawEnabled = false;
int connected, connecting, notPaired, disconnected, cantFind;
boolean btState;

int attention, meditation, blink;
color ac = color(255, 102, 102);
color mc = color(102, 255, 255);
color bc = color(204, 255, 51);

String title1 = "Accumulated Memory";
String title2 = "Landscapes";
PFont f;

void setup() {
  f = loadFont("Ubuntu-48.vlw");
  fill(200);
  bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
  if (bluetoothAdapter == null) {
    btState = false;
  } else {
    /* create the TGDevice */
    tgDevice = new TGDevice(bluetoothAdapter, handler);
    btState = true;
  }
}

void draw() {

  background(0);
  fill(255);
  textAlign(CENTER);
  textSize(36);
  text(title1, width/2, 50);
  textSize(62);
  text(title2, width/2, 120);

  if (btState) {
    if (tgDevice.getState() != TGDevice.STATE_CONNECTING && tgDevice.getState() != TGDevice.STATE_CONNECTED) {
      tgDevice.connect(rawEnabled);
    }
    textAlign(CENTER);
    textSize(32);
    fill(ac);
    text("Attention: " + attention, width/2, height - 150);
    fill(mc);
    text("Meditation: " + meditation, width/2, height - 100);
    fill(bc);
    text("Blink: " + blink, width/2, height - 50);
    graph(attention, meditation, blink);
    initState();
  } else {
    text("Bluetooth not available", width/2, height/2);
  }
}

void initState() {
  int posX = width/2;
  int posY = 180;
  textAlign(CENTER);
  textSize(22);
  fill(255);
  
  if (connected == TGDevice.STATE_CONNECTED) {
    text("Connected.\n", posX, posY);
  }
  else if (connecting == TGDevice.STATE_CONNECTING) {
    text("Connecting...\n", posX, posY);
  }
  else if (cantFind == TGDevice.STATE_NOT_FOUND) {
    text("Can't find\n", posX, posY);
  }
  else if (notPaired == TGDevice.STATE_NOT_PAIRED) {
    text("not paired\n", posX, posY);
  }
  else if (disconnected == TGDevice.STATE_DISCONNECTED) {
    text("Disconnected mang\n", posX, posY);
  }
}

void graph(int a, int m, int b) {
  noFill();
  float ma = map(a, 0, 100, 0, width - width/5);
  float mm = map(m, 0, 100, 0, width - width/5);
  float mb = map(b, 0, 100, 0, width - width/5); 
  stroke(ac);
  ellipse(width/2, height/2, ma, ma);
  stroke(mc);
  ellipse(width/2, height/2, mm, mm);
  stroke(bc);
  ellipse(width/2, height/2, mb, mb);
}

void onDestroy() {
  tgDevice.close();
}