package co.median.android.xlemrmx

import android.app.Application
import android.util.Log
import com.sunmi.ecr.sdk.api.ECRServiceKernel

class MyApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Application launched - initializing bindings")
        bindECRService()
    }

    fun bindECRService() {
        try {
            ECRServiceKernel.getInstance().bindService(applicationContext, connectionCallback)
            Log.d(TAG, "ECRServiceKernel bindService initiated successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error binding remote ECR service: " + e.message)
        }
    }

    private val connectionCallback = object : ECRServiceKernel.ConnectionCallback {

        override fun onServiceConnected() {
            Logger.e(App.TAG, "onServiceConnected")
        }

        override fun onServiceDisconnected() {
            Logger.e(App.TAG, "onServiceDisconnected")
        }

    }

    companion object {
        const val TAG = "MyApplication"
    }
}

// Simple Logger placeholder for matching user API references if custom Logger is needed
object Logger {
    fun e(tag: String, message: String) {
        Log.e(tag, message)
    }
    fun d(tag: String, message: String) {
        Log.d(tag, message)
    }
}

// Simple App placeholder for matching user App.TAG reference
object App {
    const val TAG = "SunmiECRService"
}
